import express, { Application } from 'express';
import cors from 'cors';
import { copilotRuntimeNodeHttpEndpoint } from '@copilotkit/runtime';
import { runtime, setCurrentRequestUserId } from './runtime';
import { DynamicGeminiAdapter } from './adapter';
import { isAuthEnabled, verifyJwt } from './auth';
import apiRoutes from './routes';
import logger from '../logger';
import { chatDb } from './database';


// This function will be imported by the main graphql-api server
export function mountCopilotKit(app: Application) {
  const handler = copilotRuntimeNodeHttpEndpoint({
    endpoint: '/api/copilotkit',
    runtime,
    serviceAdapter: new DynamicGeminiAdapter(),
  });

  const corsOptions = {
    origin: [
      'http://localhost:8008', // local browser dev
      'http://localhost:8010', // local api dev
      'https://gnomad.broadinstitute.org', // production
    ],
    credentials: true,
  };

  // Mount all the modular API routes
  app.use('/api/copilotkit', apiRoutes);

  logger.info('CopilotKit thread management API mounted');

  // Mount the main CopilotKit runtime handler
  app.use('/api/copilotkit', express.json({ limit: '50mb' }), cors(corsOptions), async (req, res, next) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    setCurrentRequestUserId(null);

    // --- Authorization for CopilotKit runtime ---
    if (isAuthEnabled) {
      try {
        const authHeader = req.headers.authorization;
        logger.info({
          message: 'CopilotKit auth check',
          requestId,
          hasAuthHeader: !!authHeader,
          authHeaderPrefix: authHeader?.substring(0, 20),
          method: req.method,
          path: req.path
        });

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          logger.warn({ message: 'Missing or invalid auth header', requestId });
          return res.status(401).json({ error: 'Authorization header is missing or invalid.' });
        }

        const token = authHeader.substring(7);
        const payload = await verifyJwt(token);
        const userId = payload?.sub;
        const userEmail = payload?.email as string | undefined;
        const userName = payload?.name as string | undefined;

        logger.info({
          message: 'JWT verified successfully',
          requestId,
          userId,
          hasPayload: !!payload,
          payloadKeys: payload ? Object.keys(payload) : []
        });

        if (!userId) {
          logger.error({ message: 'User ID not found in token payload', requestId, payload });
          return res.status(401).json({ error: 'User ID not found in token.' });
        }

        try {
          await chatDb.upsertUser({ userId, email: userEmail, name: userName });
        } catch (error: any) {
          logger.warn({ message: 'Failed to upsert user info', userId, error: error.message });
        }

        (req as any).copilotUserId = userId;
        setCurrentRequestUserId(userId);

        logger.info({
          message: 'Stored userId on request object',
          requestId,
          userId,
        });
      } catch (error: any) {
        logger.error({
          message: 'JWT validation error',
          requestId,
          error: error.message,
          stack: error.stack
        });
        return res.status(401).json({ error: 'Invalid authentication token.' });
      }
    }

    // Log the request with more detail about the conversation
    let threadId: string | undefined;
    let messageCount: number | undefined;
    let model: string | undefined;
    try {
      const body = req.body || {};
      threadId = body.threadId;
      messageCount = body.messages?.length || 0;
      model = body.forwardedParameters?.model || 'gemini-2.5-flash';
    } catch (e) {
      // ignore parsing errors
    }

    logger.info({
      message: 'CopilotKit request',
      requestId,
      threadId,
      messageCount,
      model,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
    });

    // Wrap the response to log completion
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      logger.info({
        message: 'CopilotKit response',
        requestId,
        model,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      });
      return originalSend.call(this, data);
    };

    (async () => handler(req, res))().catch((error) => {
      logger.error({
        message: 'CopilotKit error',
        error: error.message,
        stack: error.stack,
        method: req.method,
        path: req.path,
      });
      next(error);
    });
  });

  logger.info('CopilotKit server mounted on /api/copilotkit');
}

// For local development, allow running as a standalone server
if (require.main === module) {
  const app = express();
  mountCopilotKit(app);

  const PORT = process.env.COPILOTKIT_PORT || 4001;
  app.listen(PORT, () => {
    console.log(`CopilotKit server listening on http://localhost:${PORT}/api/copilotkit`);
  });
}
