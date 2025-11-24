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
import { LocalMCPClient } from './mcp-client';
import { chatDb } from './database';
import logger from '../logger';

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
        }
      },

      onAfterRequest: async ({ threadId, inputMessages, outputMessages, properties }) => {
        if (!threadId) {
          logger.warn({ message: 'No threadId provided - skipping persistence' });
          return;
        }

        try {
          // Combine all messages and save to PostgreSQL
          // Filter out internal CopilotKit messages that don't have a role (e.g., ActionExecutionMessage)
          const allMessages = [...(inputMessages || []), ...(outputMessages || [])]
            .filter((msg: any) => msg.role) // Only keep messages with a role
            .map((msg: any) => ({
              role: msg.role,
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
              id: msg.id,
              type: (msg.constructor?.name || msg.type || 'Unknown'),
            }));

          // Get model from forwardedParameters if available
          const model = (properties as any)?.forwardedParameters?.model;

          await chatDb.saveMessages(threadId, allMessages, model);

          logger.info({
            message: 'Chat messages saved to PostgreSQL',
            threadId,
            messageCount: allMessages.length,
          });
        } catch (error: any) {
          logger.error({
            message: 'Failed to save chat messages',
            threadId,
            error: error.message,
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

  const handler = copilotRuntimeNodeHttpEndpoint({
    endpoint: '/api/copilotkit',
    runtime,
    serviceAdapter: new DynamicGeminiAdapter(),
  });

  // Define CORS options for the CopilotKit endpoint
  const corsOptions = {
    origin: [
      'http://localhost:8008', // local browser dev
      'http://localhost:8010', // local api dev
      'https://gnomad.broadinstitute.org', // production
    ],
    credentials: true,
  };

  // API Endpoints for thread management - MUST be registered BEFORE the general CopilotKit middleware
  // to avoid being caught by the catch-all handler

  // List all threads
  app.get('/api/copilotkit/threads', cors(corsOptions), async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const threads = await chatDb.listThreads(limit, offset);
      res.json(threads);
    } catch (error: any) {
      logger.error({ message: 'Failed to list threads', error: error.message });
      res.status(500).json({ error: 'Failed to list threads' });
    }
  });

  // Get messages for a specific thread
  app.get('/api/copilotkit/threads/:threadId/messages', cors(corsOptions), async (req: Request, res: Response) => {
    try {
      const messages = await chatDb.getMessages(req.params.threadId);
      res.json(messages);
    } catch (error: any) {
      logger.error({ message: 'Failed to get messages', error: error.message });
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  // Delete a thread
  app.delete('/api/copilotkit/threads/:threadId', cors(corsOptions), async (req: Request, res: Response) => {
    try {
      await chatDb.deleteThread(req.params.threadId);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ message: 'Failed to delete thread', error: error.message });
      res.status(500).json({ error: 'Failed to delete thread' });
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
  app.use('/api/copilotkit', cors(corsOptions), (req, res, next) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

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
