import * as fs from 'fs';
import logger from '../logger';

// Debug logging configuration
const DEBUG_TOKEN_COUNTING = process.env.DEBUG_TOKEN_COUNTING === 'true';
const DEBUG_LOG_FILE = '/app/debug-token-counting.log';

// Helper to write debug logs to file (only when DEBUG_TOKEN_COUNTING is enabled)
export const debugLog = (data: any) => {
  if (!DEBUG_TOKEN_COUNTING) return;

  try {
    const timestamp = new Date().toISOString();
    const logEntry = `\n[${timestamp}] ${JSON.stringify(data, null, 2)}\n`;
    fs.appendFileSync(DEBUG_LOG_FILE, logEntry);
  } catch (error) {
    console.error('Failed to write to debug log file:', error);
  }
};

/**
 * Extracts text content from a tool result, handling various formats.
 * MCP tools can return results in multiple formats:
 * - Plain string
 * - JSON string that needs parsing
 * - MCP array: [{type: "text", text: "..."}]
 * - Object with content array: {content: [{type: "text", text: "..."}], structuredContent: {...}}
 * - Object with textContent field
 *
 * This function extracts ONLY the text meant for the LLM, ignoring structuredContent.
 */
export interface ContentExtractionResult {
  content: string;
  method: string;
  parsedFromJson: boolean;
}

export const extractTextContent = (result: any, messageId?: string): ContentExtractionResult => {
  let parsedResult = result;
  let parsedFromJson = false;

  // Parse result if it's a JSON string (CopilotKit sometimes serializes it)
  if (typeof result === 'string') {
    try {
      parsedResult = JSON.parse(result);
      parsedFromJson = true;
      debugLog({
        step: 'extractTextContent-parsing',
        msgId: messageId,
        note: 'Parsed JSON string result',
      });
    } catch (e) {
      // If it's not valid JSON, treat it as plain text
      return {
        content: result,
        method: 'plain-string',
        parsedFromJson: false,
      };
    }
  }

  // Debug: Log the parsed structure
  if (DEBUG_TOKEN_COUNTING && messageId) {
    const isString = typeof parsedResult === 'string';
    const isArray = Array.isArray(parsedResult);
    const hasContent = !!(parsedResult as any)?.content || isArray;
    const hasTextContent = !!(parsedResult as any)?.textContent;
    const hasStructured = !!(parsedResult as any)?.structuredContent;

    debugLog({
      step: 'extractTextContent-analyzing',
      msgId: messageId,
      flags: `string:${isString} array:${isArray} content:${hasContent} textContent:${hasTextContent} structured:${hasStructured}`,
    });
  }

  let content = '';
  let method = 'unknown';

  if (typeof parsedResult === 'string') {
    content = parsedResult;
    method = 'plain-string';
  } else if (Array.isArray(parsedResult)) {
    // MCP format can be an array directly: [{type: "text", text: "..."}]
    content = parsedResult
      .filter((item: any) => item.type === 'text' && item.text)
      .map((item: any) => item.text)
      .join('\n');
    method = 'MCP-array';
  } else if (parsedResult?.content && Array.isArray(parsedResult.content)) {
    // Extract text from content array: {content: [{type: "text", text: "..."}]}
    content = parsedResult.content
      .filter((item: any) => item.type === 'text' && item.text)
      .map((item: any) => item.text)
      .join('\n');
    method = 'content-array';
  } else if (parsedResult?.textContent) {
    // Fallback for other formats with textContent field
    content = Array.isArray(parsedResult.textContent)
      ? parsedResult.textContent.map((item: any) => item.text || '').join('\n')
      : String(parsedResult.textContent);
    method = 'textContent';
  } else {
    // Final fallback: no text representation found
    content = '[Tool result with no text representation]';
    method = 'fallback-no-text';
    if (messageId) {
      logger.warn({
        message: 'Tool result has no extractable text content',
        messageId,
        resultKeys: Object.keys(parsedResult || {}),
      });
    }
  }

  debugLog({
    step: 'extractTextContent-result',
    msgId: messageId,
    method,
    len: content.length,
    preview: content.substring(0, 100),
  });

  return { content, method, parsedFromJson };
};

// Log startup status
if (DEBUG_TOKEN_COUNTING) {
  debugLog({ message: 'Token counting debug logging enabled' });
  logger.info({ message: 'Token counting debug logging enabled', logFile: DEBUG_LOG_FILE });
} else {
  logger.info({ message: 'Token counting debug logging disabled (set DEBUG_TOKEN_COUNTING=true to enable)' });
}

export const isDebugEnabled = () => DEBUG_TOKEN_COUNTING;
