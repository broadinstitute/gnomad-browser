import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import {
  CopilotRuntime,
  GoogleGenerativeAIAdapter,
  copilotRuntimeNodeHttpEndpoint,
  CopilotServiceAdapter,
  CopilotRuntimeChatCompletionRequest,
  CopilotRuntimeChatCompletionResponse,
} from '@copilotkit/runtime';
import { auth } from 'express-oauth2-jwt-bearer';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { LocalMCPClient } from './mcp-client';
import { chatDb } from './database';
import logger from '../logger';

// Authorization middleware
const isAuthEnabled = process.env.REACT_APP_AUTH0_ENABLE === 'true';
const checkJwt = isAuthEnabled ? auth({
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || '',
  audience: process.env.AUTH0_AUDIENCE || '',
}) : (req: any, res: any, next: any) => next(); // No-op if auth is disabled

// Standalone JWT verifier for use in CopilotKit middleware
const JWKS = isAuthEnabled ? createRemoteJWKSet(
  new URL(`${process.env.AUTH0_ISSUER_BASE_URL}.well-known/jwks.json`)
) : null;

const verifyJwt = async (token: string) => {
  if (!isAuthEnabled || !JWKS) {
    return null;
  }
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: process.env.AUTH0_ISSUER_BASE_URL,
    audience: process.env.AUTH0_AUDIENCE,
  });
  return payload;
};

// Dynamic adapter that selects the model based on forwardedParameters
class DynamicGeminiAdapter implements CopilotServiceAdapter {
  async process(
    request: CopilotRuntimeChatCompletionRequest,
  ): Promise<CopilotRuntimeChatCompletionResponse> {
    // Get the model from forwardedParameters, defaulting to gemini-2.5-flash
    const model = request.forwardedParameters?.model || 'gemini-2.5-flash';

    logger.info({
      message: 'Using model for CopilotKit request',
      model,
    });

    // Create a new GoogleGenerativeAIAdapter with the selected model
    const adapter = new GoogleGenerativeAIAdapter({
      model,
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
    });

    // Delegate to the adapter
    return adapter.process(request);
  }
}

// This function will be imported by the main graphql-api server
export function mountCopilotKit(app: Application) {
  // Use an environment variable for the gmd command path, defaulting to 'gmd' for production.
  const gmdCommand = process.env.GMD_COMMAND_PATH || 'gmd';
  // Configure the MCP server command.
  // Since the MCP server is colocalized with the GraphQL API, it can call it locally
  const mcpConfig = {
    command: gmdCommand,
    args: ['mcp', 'serve'],
    env: {
      GNOMAD_API_URL: process.env.GNOMAD_API_URL || 'http://localhost:8000/api',
    },
  };

  // Create a single shared MCP client instance
  let sharedMCPClient: LocalMCPClient | null = null;

  // Store userId per thread for the current request
  // This is a workaround since we can't modify the request body
  // We use a short-lived map that correlates request timing to userId
  const threadUserIdMap = new Map<string, string>();

  // Store the most recent authenticated userId
  // This is safe because requests are processed sequentially per thread
  let currentRequestUserId: string | null = null;

  // Create runtime with MCP support and persistence middleware
  const runtime = new CopilotRuntime({
    // Middleware for PostgreSQL persistence
    middleware: {
      onBeforeRequest: async ({ threadId, inputMessages, properties }) => {
        // Log the start of a request
        if (threadId) {
          logger.info({
            message: 'Chat request started',
            threadId,
            messageCount: inputMessages?.length || 0,
          });

          // Store the current userId for this thread if we have one
          if (currentRequestUserId && !threadUserIdMap.has(threadId)) {
            threadUserIdMap.set(threadId, currentRequestUserId);
            logger.info({
              message: 'Stored userId for thread from current request',
              threadId,
              userId: currentRequestUserId,
            });
          }

          // Log message types and any potential issues
          if (inputMessages && inputMessages.length > 0) {
            inputMessages.forEach((msg: any, idx: number) => {
              const msgType = msg.constructor?.name || msg.type || 'Unknown'

              // Log basic info
              logger.info({
                message: 'Input message',
                index: idx,
                type: msgType,
                id: msg.id,
                hasArguments: msg.arguments !== undefined,
                argumentsType: msg.arguments ? typeof msg.arguments : 'undefined',
                hasResult: msg.result !== undefined,
                resultType: msg.result ? typeof msg.result : 'undefined',
              })

              // Log the full message for tool-related messages
              if (msgType === 'ActionExecutionMessage' || msgType === 'ResultMessage') {
                try {
                  const serialized = JSON.stringify(msg, (key, value) => {
                    if (typeof value === 'function') return '[Function]'
                    if (key === 'constructor') return '[Constructor]'
                    return value
                  })
                  logger.info({
                    message: 'Tool message details',
                    index: idx,
                    type: msgType,
                    fullMessage: serialized.substring(0, 1000), // Limit to 1000 chars
                  })
                } catch (e: any) {
                  logger.error({
                    message: 'Failed to serialize tool message',
                    index: idx,
                    error: e.message,
                  })
                }
              }
            })
          }
        }

        // Get userId from the threadUserIdMap
        const userId = threadId ? threadUserIdMap.get(threadId) : undefined;

        // --- Authorization check for existing threads ---
        if (isAuthEnabled && userId && threadId) {
          const ownerId = await chatDb.getThreadOwner(threadId);
          // If the thread exists and the owner is not the current user, deny access.
          if (ownerId && ownerId !== userId) {
            throw new Error('User does not have access to this thread.');
          }
        }
      },

      onAfterRequest: async ({ threadId, inputMessages, outputMessages, properties }) => {
        if (!threadId) {
          logger.warn({ message: 'No threadId provided - skipping persistence' });
          return;
        }

        // Get userId from the threadUserIdMap, defaulting to 'anonymous' if not found
        const userId = isAuthEnabled
          ? (threadUserIdMap.get(threadId) ?? 'anonymous')
          : 'anonymous';

        logger.info({
          message: 'onAfterRequest called',
          threadId,
          isAuthEnabled,
          userId,
          hasUserIdInMap: !!threadUserIdMap.get(threadId),
        });

        // Log a warning if we expected a userId but didn't find one
        if (isAuthEnabled && !threadUserIdMap.get(threadId)) {
          logger.warn({
            message: 'userId not found in threadUserIdMap, using anonymous',
            threadId,
          });
        }

        logger.info({
          message: 'Will save messages with userId',
          threadId,
          userId,
          messageCount: [...(inputMessages || []), ...(outputMessages || [])].length
        });

        try {
          // Combine all messages and save to PostgreSQL
          const allMessages = [...(inputMessages || []), ...(outputMessages || [])];

          logger.info({
            message: 'Processing messages for save',
            threadId,
            messageTypes: allMessages.map((m: any) => m.constructor?.name || m.type || 'Unknown'),
            messageIds: allMessages.map((m: any) => m.id),
          });

          // Get model from forwardedParameters if available
          const model = (properties as any)?.forwardedParameters?.model;

          await chatDb.saveMessages(threadId, userId, allMessages, model);

          logger.info({
            message: 'Chat messages saved to PostgreSQL',
            threadId,
            messageCount: allMessages.length,
          });

          // Clean up the map entry after successful persistence
          threadUserIdMap.delete(threadId);
        } catch (error: any) {
          logger.error({
            message: 'Failed to save chat messages',
            threadId,
            error: error.message,
            stack: error.stack,
          });
          // Don't throw - we don't want persistence failures to break the chat
        }
      },
    },

    // Function to create MCP clients based on configuration
    createMCPClient: async (config) => {
      // For local MCP servers, use the stdio client
      if (config.endpoint === 'local://gnomad') {
        // Reuse the same client instance across all requests
        if (!sharedMCPClient) {
          sharedMCPClient = new LocalMCPClient(mcpConfig);
          await sharedMCPClient.connect();
        }
        return sharedMCPClient;
      }
      throw new Error(`Unsupported MCP endpoint: ${config.endpoint}`);
    },

    // Configure which MCP servers are available
    mcpServers: [
      {
        endpoint: 'local://gnomad',
        apiKey: undefined, // Not needed for local servers
      },
    ],
  });

  const baseHandler = copilotRuntimeNodeHttpEndpoint({
    endpoint: '/api/copilotkit',
    runtime,
    serviceAdapter: new DynamicGeminiAdapter(),
  });

  // Wrap the handler to set the current request userId
  const handler = async (req: any, res: any) => {
    // Set the current request userId so onBeforeRequest can pick it up
    if (req.copilotUserId) {
      currentRequestUserId = req.copilotUserId;
      logger.info({
        message: 'Set current request userId',
        userId: currentRequestUserId,
      });
    } else {
      currentRequestUserId = null;
    }

    try {
      return await baseHandler(req, res);
    } finally {
      // Clear the current userId after the request completes
      currentRequestUserId = null;
    }
  };

  // Define CORS options for the CopilotKit endpoint
  const corsOptions = {
    origin: [
      'http://localhost:8008', // local browser dev
      'http://localhost:8010', // local api dev
      'https://gnomad.broadinstitute.org', // production
    ],
    credentials: true,
  };

  // Add JSON body parser middleware for POST requests with increased limit
  app.use('/api/copilotkit/threads', express.json({ limit: '50mb' }));

  // API Endpoints for thread management - MUST be registered BEFORE the general CopilotKit middleware
  // to avoid being caught by the catch-all handler

  // List all threads
  app.get('/api/copilotkit/threads', cors(corsOptions), checkJwt, async (req: Request, res: Response) => {
    try {
      const userId = isAuthEnabled ? (req as any).auth.payload.sub : 'anonymous';
      logger.info({
        message: 'Listing threads',
        userId,
        isAuthEnabled,
        hasAuth: !!(req as any).auth,
        authPayload: (req as any).auth?.payload
      });
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const threads = await chatDb.listThreads(userId, limit, offset);
      res.json(threads);
    } catch (error: any) {
      logger.error({ message: 'Failed to list threads', error: error.message, stack: error.stack });
      res.status(500).json({ error: 'Failed to list threads' });
    }
  });

  // Create or ensure a thread exists
  app.post('/api/copilotkit/threads', cors(corsOptions), checkJwt, async (req: Request, res: Response) => {
    try {
      const userId = isAuthEnabled ? (req as any).auth.payload.sub : 'anonymous';
      const { threadId, model } = req.body;
      if (!threadId) {
        return res.status(400).json({ error: 'threadId is required' });
      }
      await chatDb.ensureThread(threadId, userId, model);
      res.json({ success: true, threadId });
    } catch (error: any) {
      logger.error({ message: 'Failed to create thread', error: error.message });
      res.status(500).json({ error: 'Failed to create thread' });
    }
  });

  // Get messages for a specific thread
  app.get('/api/copilotkit/threads/:threadId/messages', cors(corsOptions), checkJwt, async (req: Request, res: Response) => {
    try {
      const userId = isAuthEnabled ? (req as any).auth.payload.sub : 'anonymous';
      logger.info({
        message: 'Getting messages',
        threadId: req.params.threadId,
        userId,
        isAuthEnabled,
        hasAuth: !!(req as any).auth,
        authHeader: req.headers.authorization ? 'present' : 'missing'
      });
      const messages = await chatDb.getMessages(req.params.threadId, userId);
      res.json(messages);
    } catch (error: any) {
      logger.error({
        message: 'Failed to get messages',
        threadId: req.params.threadId,
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  // Delete a thread
  app.delete('/api/copilotkit/threads/:threadId', cors(corsOptions), checkJwt, async (req: Request, res: Response) => {
    try {
      const userId = isAuthEnabled ? (req as any).auth.payload.sub : 'anonymous';
      await chatDb.deleteThread(req.params.threadId, userId);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ message: 'Failed to delete thread', error: error.message });
      res.status(500).json({ error: 'Failed to delete thread' });
    }
  });

  // Get a specific tool result
  app.get('/api/copilotkit/tool_results/:resultId', cors(corsOptions), checkJwt, async (req: Request, res: Response) => {
    try {
      const userId = isAuthEnabled ? (req as any).auth.payload.sub : 'anonymous';
      const resultId = req.params.resultId;
      const resultData = await chatDb.getToolResult(resultId, userId);
      if (resultData) {
        res.json(resultData);
      } else {
        res.status(404).json({ error: 'Tool result not found or access denied' });
      }
    } catch (error: any) {
      logger.error({ message: 'Failed to get tool result', error: error.message });
      res.status(500).json({ error: 'Failed to get tool result' });
    }
  });

  // Health check endpoint
  app.get('/api/copilotkit/health', cors(corsOptions), async (req: Request, res: Response) => {
    const dbHealthy = await chatDb.healthCheck();
    res.json({
      status: dbHealthy ? 'healthy' : 'degraded',
      database: dbHealthy ? 'connected' : 'disconnected',
    });
  });

  logger.info('CopilotKit thread management API mounted');

  // Mount the handler on the provided Express app with its own CORS middleware
  // Add JSON body parser first so we can access req.body
  // Use a large limit to handle tool results with structured data
  app.use('/api/copilotkit', express.json({ limit: '50mb' }), cors(corsOptions), async (req, res, next) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

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

        // Store userId on the request object so it's available to the runtime handler
        // We can't modify req.body because GraphQL validates it strictly
        (req as any).copilotUserId = userId;

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
