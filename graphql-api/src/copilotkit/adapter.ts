import {
  CopilotServiceAdapter,
  CopilotRuntimeChatCompletionRequest,
  CopilotRuntimeChatCompletionResponse,
  GoogleGenerativeAIAdapter,
} from '@copilotkit/runtime';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { chatDb } from './database';
import logger from '../logger';
import { extractTextContent } from './debug-logger';

// Store token usage per thread for later retrieval
export const threadTokenUsage = new Map<string, {
  inputTokens: number;
  outputTokens: number;
  previousCumulativeInput: number; // For calculating incremental cost
  systemPromptTokens: number;
  toolDefinitionTokens: number;
  historyTokens: number;
  toolResultTokens: number;
  userMessageTokens: number;
}>();

// Dynamic adapter that selects the model based on forwardedParameters and captures token usage
export class DynamicGeminiAdapter implements CopilotServiceAdapter {
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
          let extractionPath = 'none';

          if (msg.content) {
            content = msg.content;
            extractionPath = 'msg.content';
          } else if (msg.textMessage) {
            content = msg.textMessage.content;
            extractionPath = 'msg.textMessage.content';
          } else if (msg.result) {
            // For tool results, extract only the text interpretation for the LLM
            // The structuredContent is NEVER sent to the LLM (it's for frontend only)
            const extraction = extractTextContent(msg.result, msg.id);
            content = extraction.content;
            extractionPath = `result (${extraction.method})`;
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

        // Count tool result tokens separately (for total context calculation)
        // Note: We don't track individual tools here - that happens in onAfterRequest
        try {
          if (toolResultContent.length > 0) {
            // Count total tool result tokens for context size tracking
            toolResultTokens = (await geminiModel.countTokens({ contents: toolResultContent })).totalTokens;
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
        const cumulativeInputTokens = systemPromptTokens + historyTokens + toolResultTokens + userMessageTokens + toolDefinitionTokens;

        // Calculate incremental cost for this turn
        const incrementalInputTokens = cumulativeInputTokens - previousCumulativeInput;
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
        });
      } catch (error: any) {
        logger.error({ message: 'Failed to count tokens using Gemini API', threadId, error: error.message });
      }
    }

    return response;
  }
}
