import { CopilotRuntime } from '@copilotkit/runtime';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LocalMCPClient } from './mcp-client';
import { chatDb } from './database';
import logger from '../logger';
import { isAuthEnabled } from './auth';
import { threadTokenUsage } from './adapter';
import { extractTextContent, debugLog } from './debug-logger';

// Store userId per thread for the current request
export const threadUserIdMap = new Map<string, string>();
// Store the most recent authenticated userId
export let currentRequestUserId: string | null = null;
export const setCurrentRequestUserId = (id: string | null) => {
  currentRequestUserId = id;
};


// Use an environment variable for the gmd command path, defaulting to 'gmd' for production.
const gmdCommand = process.env.GMD_COMMAND_PATH || 'gmd';
// Configure the MCP server command.
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
export const runtime = new CopilotRuntime({
  middleware: {
    onBeforeRequest: async ({ threadId, inputMessages }) => {
      if (threadId) {
        logger.info({
          message: 'Chat request started',
          threadId,
          messageCount: inputMessages?.length || 0,
        });

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

        const userId = threadId ? threadUserIdMap.get(threadId) : undefined;
        if (isAuthEnabled && userId && threadId) {
          const ownerId = await chatDb.getThreadOwner(threadId);
          if (ownerId && ownerId !== userId) {
            throw new Error('User does not have access to this thread.');
          }
        }
      }
    },
    onAfterRequest: async ({ threadId, inputMessages, outputMessages, properties }) => {
      if (!threadId) {
        logger.warn({ message: 'No threadId provided - skipping persistence' });
        return;
      }

      const userId = isAuthEnabled ? (threadUserIdMap.get(threadId) ?? 'anonymous') : 'anonymous';

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
        const allMessages = [...(inputMessages || []), ...(outputMessages || [])];

        logger.info({
          message: 'Processing messages for save',
          threadId,
          messageTypes: allMessages.map((m: any) => m.constructor?.name || m.type || 'Unknown'),
          messageIds: allMessages.map((m: any) => m.id),
        });

        const model = (properties as any)?.forwardedParameters?.model;
        const tokenUsageForTurn = threadTokenUsage.get(threadId);
        const incrementalInputTokens = tokenUsageForTurn
          ? tokenUsageForTurn.inputTokens - tokenUsageForTurn.previousCumulativeInput
          : 0;
        const tokenBreakdown = tokenUsageForTurn ? {
          systemPromptTokens: tokenUsageForTurn.systemPromptTokens || 0,
          toolDefinitionTokens: tokenUsageForTurn.toolDefinitionTokens || 0,
          historyTokens: tokenUsageForTurn.historyTokens || 0,
          toolResultTokens: tokenUsageForTurn.toolResultTokens || 0,
          userMessageTokens: tokenUsageForTurn.userMessageTokens || 0,
        } : undefined;

        const toolUsage = new Map<string, { tokens: number; executionTime?: number }>();
        const actionMessages = (outputMessages || []).filter(
          (msg: any) => msg.constructor?.name === 'ActionExecutionMessage' || msg.type === 'ActionExecutionMessage'
        );
        const resultMessagesInOutput = (outputMessages || []).filter(
          (msg: any) => msg.constructor?.name === 'ResultMessage' || msg.type === 'ResultMessage'
        );

        if (resultMessagesInOutput.length > 0) {
          try {
            const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
            const modelName = (properties as any)?.forwardedParameters?.model || 'gemini-2.5-flash';
            const geminiModel = genAI.getGenerativeModel({ model: modelName });

            for (const resultMsg of resultMessagesInOutput) {
              try {
                const extraction = extractTextContent((resultMsg as any).result, resultMsg.id);
                const content = extraction.content;

                if (content) {
                  const tokenCount = (await geminiModel.countTokens(content)).totalTokens;
                  const actionId = (resultMsg as any).actionExecutionId || (resultMsg as any).parentMessageId;
                  const actionMessage = actionMessages.find((m: any) => m.id === actionId);
                  const toolName = (actionMessage as any)?.name || (actionMessage as any)?.toolName || 'unknown_tool';

                  debugLog({
                    step: 'tokenCounting-result',
                    msgId: resultMsg.id,
                    tool: toolName,
                    tokens: tokenCount,
                  });

                  toolUsage.set(toolName, {
                    tokens: tokenCount,
                    executionTime: undefined,
                  });

                  logger.info({
                    message: 'Tracked tool invocation for this turn',
                    threadId,
                    toolName,
                    tokens: tokenCount,
                  });
                }
              } catch (perToolError: any) {
                logger.warn({
                  message: 'Failed to count individual tool result tokens',
                  error: perToolError.message,
                });
              }
            }
          } catch (error: any) {
            logger.error({
              message: 'Failed to track tool usage for this turn',
              threadId,
              error: error.message,
            });
          }
        }

        if (outputMessages && outputMessages.length > 0) {
          try {
            const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
            const model = (properties as any)?.forwardedParameters?.model || 'gemini-2.5-flash';
            const geminiModel = genAI.getGenerativeModel({ model });
            const outputText = outputMessages
              .map((msg: any) => msg.content || msg.textMessage?.content || '')
              .filter(Boolean).join('\n');

            if (outputText) {
              const outputTokens = (await geminiModel.countTokens(outputText)).totalTokens;
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

        const assistantMessage = outputMessages?.find((m: any) => m.role === 'assistant');
        const outputTokensForTurn = (assistantMessage as any)?._outputTokens || 0;
        const fullRequestTokensForTurn = tokenUsageForTurn?.inputTokens || 0;

        if (incrementalInputTokens > 0 || outputTokensForTurn > 0) {
          try {
            await chatDb.updateThreadTokenUsage(threadId, incrementalInputTokens, outputTokensForTurn, fullRequestTokensForTurn);

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

        threadTokenUsage.delete(threadId);
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
      }
    },
  },
  createMCPClient: async (config) => {
    if (config.endpoint === 'local://gnomad') {
      if (!sharedMCPClient) {
        sharedMCPClient = new LocalMCPClient(mcpConfig);
        await sharedMCPClient.connect();
      }
      return sharedMCPClient;
    }
    throw new Error(`Unsupported MCP endpoint: ${config.endpoint}`);
  },
  mcpServers: [{ endpoint: 'local://gnomad', apiKey: undefined }],
});
