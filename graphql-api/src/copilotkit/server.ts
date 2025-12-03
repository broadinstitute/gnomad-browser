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
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LocalMCPClient } from './mcp-client';
import { chatDb, User } from './database';
import logger from '../logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User | null;
    }
  }
}

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

// Store token usage per thread for later retrieval
// Now includes the cumulative total before this request for delta calculation
const threadTokenUsage = new Map<string, {
  inputTokens: number;
  outputTokens: number;
  previousCumulativeInput: number; // For calculating incremental cost
  systemPromptTokens: number;
  toolDefinitionTokens: number;
  historyTokens: number;
  toolResultTokens: number;
  userMessageTokens: number;
  toolUsage: Map<string, { tokens: number; executionTime?: number }>;
}>();

// Dynamic adapter that selects the model based on forwardedParameters and captures token usage
class DynamicGeminiAdapter implements CopilotServiceAdapter {
  async process(
    request: CopilotRuntimeChatCompletionRequest,
  ): Promise<CopilotRuntimeChatCompletionResponse> {
    // Get the model from forwardedParameters, defaulting to gemini-2.5-flash
    const model = request.forwardedParameters?.model || 'gemini-2.5-flash';
    const threadId = request.threadId;

    logger.info({
      message: 'Using model for CopilotKit request',
      model,
      threadId,
    });

    // Create a new GoogleGenerativeAIAdapter with the selected model
    const adapter = new GoogleGenerativeAIAdapter({
      model,
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
    });

    // Delegate to the adapter
    const response = await adapter.process(request);

    // Count tokens using the Gemini countTokens API
    if (threadId) {
      try {
        // Get the thread's current cumulative input tokens to calculate delta
        const threadResult = await chatDb.getThreadTokens(threadId);
        const previousCumulativeInput = threadResult?.total_input_tokens || 0;

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
        const geminiModel = genAI.getGenerativeModel({ model });

        // Helper to map CopilotKit messages to Gemini's Content format
        const toGeminiContent = (msg: any) => {
          let content = '';
          if (msg.content) {
            content = msg.content;
          } else if (msg.textMessage) {
            content = msg.textMessage.content;
          } else if (msg.result) {
            // For tool results, extract only the textContent for the LLM
            // The structuredContent is for frontend display only
            if (typeof msg.result === 'string') {
              content = msg.result;
            } else if (msg.result.textContent) {
              // Extract text from MCP textContent array
              content = Array.isArray(msg.result.textContent)
                ? msg.result.textContent.map((item: any) => item.text || '').join('\n')
                : String(msg.result.textContent);
            } else {
              // Fallback: serialize the whole result (but this shouldn't happen for MCP tools)
              content = JSON.stringify(msg.result);
            }
          }
          return { role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: content }] };
        };

        // Map actions to Gemini's Tool format
        const tools = request.actions && request.actions.length > 0
          ? [
              {
                functionDeclarations: request.actions.map((action: any) => ({
                  name: action.name,
                  description: action.description,
                  parameters: action.parameters?.jsonSchema || action.parameters || {},
                })),
              },
            ]
          : [];

        // Separate messages for breakdown
        const systemMessage = request.messages.find((msg: any) => msg.role === 'system');
        const lastUserMessage = [...request.messages].reverse().find((msg: any) => msg.role === 'user');
        const allHistoryMessages = request.messages.filter(
          (msg: any) => msg.role !== 'system' && msg !== lastUserMessage
        );

        // Separate tool results from conversation history
        const toolResultMessages = allHistoryMessages.filter(
          (msg: any) => msg.constructor?.name === 'ResultMessage' || msg.type === 'ResultMessage'
        );
        const conversationHistoryMessages = allHistoryMessages.filter(
          (msg: any) => msg.constructor?.name !== 'ResultMessage' && msg.type !== 'ResultMessage'
        );

        const systemContent = systemMessage ? [toGeminiContent(systemMessage)] : [];
        const historyContent = conversationHistoryMessages.map(toGeminiContent);
        const toolResultContent = toolResultMessages.map(toGeminiContent);
        const userContent = lastUserMessage ? [toGeminiContent(lastUserMessage)] : [];

        // Count each component
        let systemPromptTokens = 0;
        let historyTokens = 0;
        let toolResultTokens = 0;
        let userMessageTokens = 0;
        let toolDefinitionTokens = 0;

        // Track per-tool token usage
        const toolUsageMap = new Map<string, { tokens: number; executionTime?: number }>();

        try {
          systemPromptTokens = systemContent.length > 0 ? (await geminiModel.countTokens({ contents: systemContent })).totalTokens : 0;
        } catch (error: any) {
          logger.warn({ message: 'Failed to count system prompt tokens', error: error.message });
        }

        try {
          historyTokens = historyContent.length > 0 ? (await geminiModel.countTokens({ contents: historyContent })).totalTokens : 0;
        } catch (error: any) {
          logger.warn({ message: 'Failed to count history tokens', error: error.message });
        }

        // Count tool result tokens separately and track per-tool usage
        try {
          if (toolResultContent.length > 0) {
            // Count total tool result tokens
            toolResultTokens = (await geminiModel.countTokens({ contents: toolResultContent })).totalTokens;

            // Count individual tool tokens for detailed tracking
            for (const msg of toolResultMessages) {
              try {
                const toolContent = toGeminiContent(msg);
                const tokenCount = (await geminiModel.countTokens({ contents: [toolContent] })).totalTokens;

                // Find the tool name from the corresponding ActionExecutionMessage
                const actionId = (msg as any).actionExecutionId;
                const actionMessage = request.messages.find(
                  (m: any) => m.id === actionId && (m.constructor?.name === 'ActionExecutionMessage' || m.type === 'ActionExecutionMessage')
                );
                const toolName = actionMessage?.name || actionMessage?.toolName || 'unknown_tool';

                toolUsageMap.set(toolName, {
                  tokens: tokenCount,
                  executionTime: undefined, // Will be filled if available
                });
              } catch (perToolError: any) {
                logger.warn({
                  message: 'Failed to count individual tool result tokens',
                  error: perToolError.message,
                });
              }
            }
          }
        } catch (error: any) {
          logger.warn({ message: 'Failed to count tool result tokens', error: error.message });
        }

        try {
          userMessageTokens = userContent.length > 0 ? (await geminiModel.countTokens({ contents: userContent })).totalTokens : 0;
        } catch (error: any) {
          logger.warn({ message: 'Failed to count user message tokens', error: error.message });
        }

        try {
          if (tools.length > 0) {
            const toolsText = JSON.stringify(tools, null, 2);
            const toolTokenResult = await geminiModel.countTokens(toolsText);
            toolDefinitionTokens = toolTokenResult.totalTokens;
          }
        } catch (toolError: any) {
          logger.warn({
            message: 'Failed to count tool definition tokens',
            error: toolError.message,
          });
        }

        // Count total request tokens - sum all components
        // Note: We sum the components rather than counting them together because
        // the Google Generative AI SDK's countTokens method handles them separately
        const cumulativeInputTokens = systemPromptTokens + historyTokens + toolResultTokens + userMessageTokens + toolDefinitionTokens;

        // Calculate incremental cost for this turn
        const incrementalInputTokens = cumulativeInputTokens - previousCumulativeInput;

        // Output tokens will be counted in onAfterRequest when we have the output messages
        const outputTokens = 0;

        threadTokenUsage.set(threadId, {
          inputTokens: cumulativeInputTokens,
          outputTokens,
          previousCumulativeInput,
          systemPromptTokens,
          toolDefinitionTokens,
          historyTokens,
          toolResultTokens,
          userMessageTokens,
          toolUsage: toolUsageMap,
        });

        logger.info({
          message: 'Token counting for this request',
          threadId,
          systemPromptTokens,
          historyTokens,
          toolResultTokens,
          userMessageTokens,
          toolDefinitionTokens,
          cumulativeInputTokens,
          previousCumulativeInput,
          incrementalInputTokens,
          messagesIncluded: request.messages.length,
          actionsIncluded: request.actions?.length || 0,
          toolInvocations: Array.from(toolUsageMap.entries()).map(([name, usage]) => ({
            tool: name,
            tokens: usage.tokens,
          })),
        });
      } catch (error: any) {
        logger.error({
          message: 'Failed to count tokens using Gemini API',
          threadId,
          error: error.message,
        });
      }
    }

    return response;
  }
}

// This function will be imported by the main graphql-api server
export function mountCopilotKit(app: Application) {
  // Authorization middleware functions
  const addUserToRequest = async (req: Request, res: Response, next: any) => {
    if (!isAuthEnabled) {
      req.user = null;
      return next();
    }
    try {
      const userId = (req as any).auth.payload.sub;
      let userEmail = (req as any).auth.payload.email;
      let userName = (req as any).auth.payload.name;

      logger.info({
        message: 'addUserToRequest - JWT payload',
        userId,
        userEmail,
        userName,
        fullPayload: (req as any).auth.payload,
      });

      // If email/name not in token, try to fetch from Auth0 userinfo endpoint
      if (userId && (!userEmail || !userName)) {
        try {
          const token = req.headers.authorization?.substring(7); // Remove "Bearer "
          if (token) {
            const userInfoResponse = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}userinfo`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (userInfoResponse.ok) {
              const userInfo = await userInfoResponse.json();
              userEmail = userEmail || userInfo.email;
              userName = userName || userInfo.name;

              logger.info({
                message: 'Fetched user info from Auth0 userinfo endpoint',
                userEmail,
                userName,
              });
            }
          }
        } catch (error: any) {
          logger.warn({ message: 'Failed to fetch userinfo from Auth0', error: error.message });
        }
      }

      if (userId) {
        // Ensure user exists in the DB on every authenticated request to a protected endpoint
        await chatDb.upsertUser({ userId, email: userEmail, name: userName });
        const user = await chatDb.getUser(userId);
        req.user = user;

        logger.info({
          message: 'addUserToRequest - user from DB',
          user,
        });
      }
      next();
    } catch (error: any) {
      logger.error({ message: 'Failed to add user to request', error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  const isAdmin = (req: Request, res: Response, next: any) => {
    if (req.user?.role === 'admin') {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: Admins only' });
  };

  const isViewerOrAdmin = (req: Request, res: Response, next: any) => {
    if (req.user?.role === 'admin' || req.user?.role === 'viewer') {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: Viewers and Admins only' });
  };

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

        // Log properties to understand what token usage data is available
        logger.info({
          message: 'onAfterRequest called with properties',
          threadId,
          properties: JSON.stringify(properties, null, 2),
        });

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

          // Get token usage for this turn to attribute to messages
          const tokenUsageForTurn = threadTokenUsage.get(threadId);
          const incrementalInputTokens = tokenUsageForTurn
            ? tokenUsageForTurn.inputTokens - tokenUsageForTurn.previousCumulativeInput
            : 0;

          // Extract token breakdown for detailed tracking
          const tokenBreakdown = tokenUsageForTurn ? {
            systemPromptTokens: tokenUsageForTurn.systemPromptTokens || 0,
            toolDefinitionTokens: tokenUsageForTurn.toolDefinitionTokens || 0,
            historyTokens: tokenUsageForTurn.historyTokens || 0,
            toolResultTokens: tokenUsageForTurn.toolResultTokens || 0,
            userMessageTokens: tokenUsageForTurn.userMessageTokens || 0,
          } : undefined;

          // Extract per-tool usage for tracking
          const toolUsage = tokenUsageForTurn?.toolUsage;

          // Count output tokens and attach to assistant message
          if (outputMessages && outputMessages.length > 0) {
            try {
              const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
              const model = (properties as any)?.forwardedParameters?.model || 'gemini-2.5-flash';
              const geminiModel = genAI.getGenerativeModel({ model });

              // Extract output text from messages
              const outputText = outputMessages
                .map((msg: any) => {
                  if (msg.content) return msg.content;
                  if (msg.textMessage) return msg.textMessage.content;
                  return '';
                })
                .filter(Boolean)
                .join('\n');

              if (outputText) {
                const outputTokenResult = await geminiModel.countTokens(outputText);
                const outputTokens = outputTokenResult.totalTokens;

                // Attach output tokens to the assistant message
                const assistantMessage = outputMessages.find((m: any) => m.role === 'assistant');
                if (assistantMessage) {
                  (assistantMessage as any)._outputTokens = outputTokens;
                }

                logger.info({
                  message: 'Counted output tokens for this turn',
                  threadId,
                  outputTokens,
                });
              }
            } catch (error: any) {
              logger.error({
                message: 'Failed to count output tokens',
                threadId,
                error: error.message,
              });
            }
          }

          await chatDb.saveMessages(threadId, userId, allMessages, model, incrementalInputTokens, tokenBreakdown, toolUsage);

          logger.info({
            message: 'Chat messages saved to PostgreSQL',
            threadId,
            messageCount: allMessages.length,
          });

          // Update thread-level cumulative token totals
          // incrementalInputTokens was already counted, get output tokens from the message
          const assistantMessage = outputMessages?.find((m: any) => m.role === 'assistant');
          const outputTokensForTurn = (assistantMessage as any)?._outputTokens || 0;

          // Get full request token count for this turn (reuse tokenUsageForTurn from above)
          const fullRequestTokensForTurn = tokenUsageForTurn?.inputTokens || 0;

          if (incrementalInputTokens > 0 || outputTokensForTurn > 0) {
            try {
              await chatDb.updateThreadTokenUsage(
                threadId,
                incrementalInputTokens,
                outputTokensForTurn,
                fullRequestTokensForTurn
              );

              logger.info({
                message: 'Thread token totals updated',
                threadId,
                incrementalInput: incrementalInputTokens,
                incrementalOutput: outputTokensForTurn,
                fullRequestTokens: fullRequestTokensForTurn,
              });
            } catch (tokenError: any) {
              logger.error({
                message: 'Failed to update thread token usage',
                threadId,
                error: tokenError.message,
              });
            }
          }

          // Clean up the token usage map
          threadTokenUsage.delete(threadId);

          // Clean up the map entry after successful persistence
          threadUserIdMap.delete(threadId);
        } catch (error: any) {
          logger.error({
            message: 'Failed to save chat messages',
            threadId,
            error: error.message,
            stack: error.stack,
            errorName: error.name,
            errorCode: error.code,
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
  app.use('/api/copilotkit/feedback', express.json());
  app.use('/api/copilotkit/users', express.json());

  // API Endpoints for thread management - MUST be registered BEFORE the general CopilotKit middleware
  // to avoid being caught by the catch-all handler

  // Get current user profile
  app.get('/api/copilotkit/users/me', cors(corsOptions), checkJwt, addUserToRequest, (req, res) => {
    if (!req.user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(req.user);
  });

  // Update current user preferences
  app.put('/api/copilotkit/users/me/preferences', cors(corsOptions), checkJwt, addUserToRequest, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { allowAdminViewing } = req.body;
      if (typeof allowAdminViewing !== 'boolean') {
        return res.status(400).json({ error: 'Invalid value for allowAdminViewing' });
      }
      await chatDb.updateUserPrivacy(req.user.userId, allowAdminViewing);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ message: 'Failed to update user preferences', error: error.message });
      res.status(500).json({ error: 'Failed to update user preferences' });
    }
  });

  // Update a user's role (admins only)
  app.put('/api/copilotkit/users/:userId/role', cors(corsOptions), checkJwt, addUserToRequest, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      if (!['user', 'viewer', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role provided' });
      }
      await chatDb.updateUserRole(userId, role);
      res.json({ success: true, userId, role });
    } catch (error: any) {
      logger.error({ message: 'Failed to update user role', error: error.message });
      res.status(500).json({ error: 'Failed to update user role' });
    }
  });

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

  // Add context to a thread
  app.post('/api/copilotkit/threads/:threadId/context', cors(corsOptions), checkJwt, async (req, res) => {
    try {
      const userId = isAuthEnabled ? (req as any).auth.payload.sub : 'anonymous';
      const { threadId } = req.params;
      const { context } = req.body;

      if (!context || !context.type || !context.id) {
        return res.status(400).json({ error: 'Invalid context object provided.' });
      }
      await chatDb.addContextToThread(threadId, userId, context);
      res.status(200).json({ success: true });
    } catch (error: any) {
      logger.error({ message: 'Failed to add context to thread', error: error.message });
      res.status(500).json({ error: 'Failed to update thread context' });
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

  // Submit feedback - accepts both authenticated and anonymous users
  app.post('/api/copilotkit/feedback', cors(corsOptions), async (req: Request, res: Response) => {
    try {
      // Try to get userId from auth if present, otherwise default to 'anonymous'
      let userId = 'anonymous';
      let userEmail: string | undefined;
      let userName: string | undefined;

      if (isAuthEnabled && req.headers.authorization?.startsWith('Bearer ')) {
        try {
          const token = req.headers.authorization.substring(7);
          const payload = await verifyJwt(token);
          userId = payload?.sub || 'anonymous';
          userEmail = payload?.email as string | undefined;
          userName = payload?.name as string | undefined;

          // Upsert user information if we have a valid userId
          if (userId !== 'anonymous') {
            await chatDb.upsertUser({ userId, email: userEmail, name: userName });
          }
        } catch (error) {
          // If JWT verification fails, continue with anonymous userId
          logger.warn({ message: 'Failed to verify JWT for feedback, using anonymous', error });
        }
      }

      const feedbackData = req.body;
      await chatDb.saveFeedback({ ...feedbackData, userId });
      res.status(201).json({ success: true });
    } catch (error: any) {
      logger.error({ message: 'Failed to save feedback', error: error.message });
      res.status(500).json({ error: 'Failed to save feedback' });
    }
  });

  // Get feedback - requires authentication and viewer/admin role
  app.get('/api/copilotkit/feedback', cors(corsOptions), checkJwt, addUserToRequest, isViewerOrAdmin, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const feedback = await chatDb.getFeedback(limit, offset);
      res.json(feedback);
    } catch (error: any) {
      logger.error({ message: 'Failed to get feedback', error: error.message });
      res.status(500).json({ error: 'Failed to get feedback' });
    }
  });

  // Get users - requires authentication and viewer/admin role
  app.get('/api/copilotkit/users', cors(corsOptions), checkJwt, addUserToRequest, isViewerOrAdmin, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const users = await chatDb.getUsers(limit, offset);
      res.json(users);
    } catch (error: any) {
      logger.error({ message: 'Failed to get users', error: error.message });
      res.status(500).json({ error: 'Failed to get users' });
    }
  });

  // === ANALYTICS ENDPOINTS ===

  // Save an analytics event
  app.post('/api/copilotkit/analytics/event', cors(corsOptions), async (req: Request, res: Response) => {
    try {
      let userId: string | undefined;
      if (isAuthEnabled) {
        try {
          const authHeader = req.headers.authorization;
          if (authHeader) {
            const token = authHeader.substring(7); // Remove "Bearer "
            const payload = await verifyJwt(token);
            userId = payload?.sub as string;
          }
        } catch (error) {
          // If token verification fails, continue without userId
          logger.warn({ message: 'Failed to verify JWT for analytics event', error });
        }
      }

      const { threadId, eventType, payload, sessionId } = req.body;

      if (!eventType) {
        return res.status(400).json({ error: 'eventType is required' });
      }

      await chatDb.saveAnalyticsEvent({
        userId,
        threadId,
        eventType,
        payload,
        sessionId,
      });

      res.status(201).json({ success: true });
    } catch (error: any) {
      logger.error({ message: 'Failed to save analytics event', error: error.message });
      res.status(500).json({ error: 'Failed to save analytics event' });
    }
  });

  // Get usage statistics (admin only)
  app.get('/api/copilotkit/admin/stats', cors(corsOptions), checkJwt, addUserToRequest, isAdmin, async (req: Request, res: Response) => {
    try {
      const stats = await chatDb.getUsageStats();
      res.json(stats);
    } catch (error: any) {
      logger.error({ message: 'Failed to get usage stats', error: error.message });
      res.status(500).json({ error: 'Failed to get usage stats' });
    }
  });

  // Get suggestion click statistics (admin only)
  app.get('/api/copilotkit/admin/stats/suggestions', cors(corsOptions), checkJwt, addUserToRequest, isAdmin, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const stats = await chatDb.getSuggestionStats(limit);
      res.json(stats);
    } catch (error: any) {
      logger.error({ message: 'Failed to get suggestion stats', error: error.message });
      res.status(500).json({ error: 'Failed to get suggestion stats' });
    }
  });

  // === ADMIN THREAD VIEWING ENDPOINTS ===

  // List all viewable threads for admins
  app.get('/api/copilotkit/admin/threads', cors(corsOptions), checkJwt, addUserToRequest, isAdmin, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const threads = await chatDb.getAllThreadsForAdmin(limit, offset);
      res.json(threads);
    } catch (error: any) {
      logger.error({ message: 'Failed to get all threads for admin', error: error.message });
      res.status(500).json({ error: 'Failed to get threads' });
    }
  });

  // Get messages for a specific thread for admins
  app.get('/api/copilotkit/admin/threads/:threadId/messages', cors(corsOptions), checkJwt, addUserToRequest, isAdmin, async (req: Request, res: Response) => {
    try {
      const { threadId } = req.params;
      const messages = await chatDb.getMessagesForAdmin(threadId);
      if (messages === null) {
        return res.status(403).json({ error: 'Access to this thread is denied by user privacy settings.' });
      }
      res.json(messages);
    } catch (error: any) {
      logger.error({ message: 'Failed to get messages for admin', error: error.message });
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  // Delete a thread (admin only - can delete any thread)
  app.delete('/api/copilotkit/admin/threads/:threadId', cors(corsOptions), checkJwt, addUserToRequest, isAdmin, async (req: Request, res: Response) => {
    try {
      const { threadId } = req.params;

      // Admins can delete any thread, so we pass a special flag or handle it differently
      // We'll use the deleteThread method but need to bypass the user check
      await chatDb.deleteThreadAsAdmin(threadId);

      logger.info({
        message: 'Admin deleted thread',
        threadId,
        adminUserId: req.user?.userId,
      });

      res.json({ success: true });
    } catch (error: any) {
      logger.error({ message: 'Failed to delete thread as admin', error: error.message });
      res.status(500).json({ error: 'Failed to delete thread' });
    }
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

        // Upsert user information on every authenticated request
        // This ensures the users table is always up-to-date with email/name from JWT
        try {
          await chatDb.upsertUser({ userId, email: userEmail, name: userName });
        } catch (error: any) {
          logger.warn({ message: 'Failed to upsert user info', userId, error: error.message });
          // Continue even if upsert fails - don't block the chat request
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
