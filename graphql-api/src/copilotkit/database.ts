import { Pool } from 'pg';
import logger from '../logger';

// Connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err: Error) => {
  logger.error({ message: 'Unexpected PostgreSQL error', error: err.message });
});

export interface ChatThread {
  id: string;
  threadId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  model: string | null;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: string;
  content: string;
  createdAt: Date;
  rawMessage: any;
}

export class ChatDatabase {
  // Get the owner of a thread for authorization checks
  async getThreadOwner(threadId: string): Promise<string | null> {
    const result = await pool.query(
      'SELECT user_id FROM chat_threads WHERE thread_id = $1',
      [threadId]
    );
    return result.rows[0]?.user_id || null;
  }

  // Ensure thread exists, create if not
  async ensureThread(threadId: string, userId: string, model?: string): Promise<void> {
    const query = `
      INSERT INTO chat_threads (thread_id, user_id, model)
      VALUES ($1, $2, $3)
      ON CONFLICT (thread_id) DO NOTHING
    `;
    await pool.query(query, [threadId, userId, model]);
  }

  // Save tool result payload and return the UUID
  async saveToolResult(
    threadId: string,
    messageId: string,
    userId: string,
    toolName: string,
    resultData: any
  ): Promise<string> {
    const result = await pool.query(
      `INSERT INTO tool_results (thread_id, message_id, user_id, tool_name, result_data)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (thread_id, message_id) DO UPDATE SET result_data = $5
       RETURNING id`,
      [threadId, messageId, userId, toolName, resultData]
    );
    return result.rows[0].id;
  }

  // Get tool result by ID, ensuring user ownership
  async getToolResult(resultId: string, userId: string): Promise<any | null> {
    const result = await pool.query(
      'SELECT result_data FROM tool_results WHERE id = $1 AND user_id = $2',
      [resultId, userId]
    );
    return result.rows[0]?.result_data || null;
  }

  // Save messages from a request
  async saveMessages(
    threadId: string,
    userId: string,
    messages: any[],
    model?: string
  ): Promise<void> {
    const client = await pool.connect();

    try {
      logger.info({
        message: 'saveMessages called',
        threadId,
        userId,
        messageCount: messages.length,
        messageTypes: messages.map(m => m.constructor?.name || m.type || typeof m),
      });

      await client.query('BEGIN');

      // Ensure thread exists and associate with user if it's new
      await client.query(`
        INSERT INTO chat_threads (thread_id, user_id, model)
        VALUES ($1, $2, $3)
        ON CONFLICT (thread_id) DO UPDATE SET
          updated_at = NOW(),
          model = COALESCE($3, chat_threads.model)
      `, [threadId, userId, model]);

      const messagesToSave = [...messages];

      // Process tool results before saving messages
      for (const msg of messagesToSave) {
        if (msg.constructor?.name === 'ResultMessage' || msg.type === 'ResultMessage') {
          // Parse result if it's a JSON string
          let parsedResult = msg.result;
          if (typeof msg.result === 'string') {
            try {
              parsedResult = JSON.parse(msg.result);
            } catch (e) {
              logger.warn({
                message: 'Failed to parse result string',
                messageId: msg.id,
                error: (e as Error).message,
              });
            }
          }

          logger.info({
            message: 'Processing ResultMessage',
            messageId: msg.id,
            hasResult: !!msg.result,
            resultType: typeof msg.result,
            hasStructuredContent: !!(parsedResult as any)?.structuredContent,
            structuredContentType: typeof (parsedResult as any)?.structuredContent,
          });

          // Update the message with parsed result
          if (parsedResult !== msg.result) {
            (msg as any).result = parsedResult;
          }
        }

        if (
          (msg.constructor?.name === 'ResultMessage' || msg.type === 'ResultMessage') &&
          msg.result?.structuredContent &&
          !msg.result.structuredContent.toolResultId // Avoid re-processing
        ) {
          // Derive parentMessageId from ResultMessage ID if not set
          // ResultMessage IDs follow pattern: "result-{actionMessageId}"
          let parentId = msg.parentMessageId;
          if (!parentId && msg.id && msg.id.startsWith('result-')) {
            parentId = msg.id.substring('result-'.length);
          }

          const actionMessage = messagesToSave.find(
            (m) => m.id === parentId && (m.constructor?.name === 'ActionExecutionMessage' || m.type === 'ActionExecutionMessage')
          );

          if (actionMessage) {
            const toolName = actionMessage.name || actionMessage.toolName;
            const structuredContent = msg.result.structuredContent;

            logger.info({
              message: 'Storing tool result in separate table',
              messageId: msg.id,
              toolName,
              dataSize: JSON.stringify(structuredContent).length,
            });

            const toolResultId = await this.saveToolResult(
              threadId,
              msg.id,
              userId,
              toolName,
              structuredContent
            );

            (msg as any).toolResultId = toolResultId;
            msg.result.structuredContent = { toolResultId };

            logger.info({
              message: 'Tool result stored successfully',
              toolResultId,
            });
          }
        }
      }

      // Insert messages (avoiding duplicates by copilot_message_id)
      for (const msg of messagesToSave) {
        // Skip messages without an ID - we can't deduplicate them
        if (!msg.id) {
          logger.warn({
            message: 'Skipping message without ID',
            messageType: msg.constructor?.name || msg.type || 'Unknown',
          });
          continue;
        }

        try {
          // Serialize content safely
          let contentValue = null;
          if (msg.content !== undefined && msg.content !== null) {
            contentValue = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          }

          // Serialize raw message with circular reference handling
          const rawMessageValue = JSON.stringify(msg, (key, value) => {
            // Handle circular references
            if (typeof value === 'object' && value !== null) {
              // Skip large or problematic objects
              if (key === 'constructor' || key === '__proto__') {
                return undefined;
              }
            }
            return value;
          });

          await client.query(`
            INSERT INTO chat_messages (thread_id, role, content, copilot_message_id, message_type, raw_message, tool_result_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (thread_id, copilot_message_id) DO NOTHING
          `, [
            threadId,
            msg.role || null,
            contentValue,
            msg.id,
            msg.constructor?.name || msg.type || 'Unknown',
            rawMessageValue,
            (msg as any).toolResultId || null,
          ]);
        } catch (msgError: any) {
          logger.error({
            message: 'Failed to insert individual message',
            threadId,
            messageId: msg.id,
            messageType: msg.constructor?.name || msg.type || 'Unknown',
            error: msgError.message,
          });
          // Continue with other messages even if one fails
        }
      }

      // Update thread stats
      await client.query(`
        UPDATE chat_threads SET
          message_count = (SELECT COUNT(*) FROM chat_messages WHERE thread_id = $1),
          title = COALESCE(title, (
            SELECT SUBSTRING(content, 1, 100)
            FROM chat_messages
            WHERE thread_id = $1 AND role = 'user'
            ORDER BY created_at ASC
            LIMIT 1
          ))
        WHERE thread_id = $1
      `, [threadId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // List threads for sidebar
  async listThreads(userId: string, limit = 50, offset = 0): Promise<ChatThread[]> {
    const result = await pool.query(`
      SELECT
        id,
        thread_id as "threadId",
        title,
        created_at as "createdAt",
        updated_at as "updatedAt",
        message_count as "messageCount",
        model
      FROM chat_threads
      WHERE user_id = $1
      ORDER BY updated_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    return result.rows;
  }

  // Get messages for a thread, ensuring ownership
  async getMessages(threadId: string, userId: string): Promise<ChatMessage[]> {
    const result = await pool.query(`
      SELECT
        m.id,
        m.thread_id as "threadId",
        m.role,
        m.content,
        m.created_at as "createdAt",
        m.raw_message as "rawMessage"
      FROM chat_messages m
      JOIN chat_threads t ON m.thread_id = t.thread_id
      WHERE m.thread_id = $1 AND t.user_id = $2
      ORDER BY m.created_at ASC
    `, [threadId, userId]);

    return result.rows;
  }

  // Delete a thread, ensuring ownership
  async deleteThread(threadId: string, userId: string): Promise<void> {
    await pool.query('DELETE FROM chat_threads WHERE thread_id = $1 AND user_id = $2', [threadId, userId]);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

export const chatDb = new ChatDatabase();
