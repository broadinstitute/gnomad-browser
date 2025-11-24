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
  // Ensure thread exists, create if not
  async ensureThread(threadId: string, model?: string): Promise<void> {
    const query = `
      INSERT INTO chat_threads (thread_id, model)
      VALUES ($1, $2)
      ON CONFLICT (thread_id) DO UPDATE SET
        updated_at = NOW(),
        model = COALESCE($2, chat_threads.model)
    `;
    await pool.query(query, [threadId, model]);
  }

  // Save messages from a request
  async saveMessages(
    threadId: string,
    messages: Array<{
      role: string;
      content: string;
      id?: string;
      type?: string;
    }>,
    model?: string
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Ensure thread exists
      await client.query(`
        INSERT INTO chat_threads (thread_id, model)
        VALUES ($1, $2)
        ON CONFLICT (thread_id) DO UPDATE SET
          updated_at = NOW(),
          model = COALESCE($2, chat_threads.model)
      `, [threadId, model]);

      // Insert messages (avoiding duplicates by copilot_message_id)
      for (const msg of messages) {
        // Skip messages without an ID - we can't deduplicate them
        if (!msg.id) continue;

        await client.query(`
          INSERT INTO chat_messages (thread_id, role, content, copilot_message_id, message_type, raw_message)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (thread_id, copilot_message_id) DO NOTHING
        `, [
          threadId,
          msg.role,
          typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          msg.id,
          msg.type,
          JSON.stringify(msg)
        ]);
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
  async listThreads(limit = 50, offset = 0): Promise<ChatThread[]> {
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
      ORDER BY updated_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return result.rows;
  }

  // Get messages for a thread
  async getMessages(threadId: string): Promise<ChatMessage[]> {
    const result = await pool.query(`
      SELECT
        id,
        thread_id as "threadId",
        role,
        content,
        created_at as "createdAt",
        raw_message as "rawMessage"
      FROM chat_messages
      WHERE thread_id = $1
      ORDER BY created_at ASC
    `, [threadId]);

    return result.rows;
  }

  // Delete a thread
  async deleteThread(threadId: string): Promise<void> {
    await pool.query('DELETE FROM chat_threads WHERE thread_id = $1', [threadId]);
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
