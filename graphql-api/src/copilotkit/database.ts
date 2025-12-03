import { Pool } from 'pg';
import logger from '../logger';
import { generateTitleForChat } from './title-generator';
import config from '../config';

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
  contexts: any[];
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: string;
  content: string;
  createdAt: Date;
  rawMessage: any;
}

export interface Feedback {
  userId?: string;
  threadId?: string;
  messageId?: string;
  source: 'message' | 'thread' | 'general';
  rating?: 1 | -1;
  feedbackText?: string;
  metadata?: Record<string, any>;
}

export interface User {
  userId: string;
  email?: string;
  name?: string;
  role?: 'user' | 'viewer' | 'admin';
  allowAdminViewing?: boolean;
}

export class ChatDatabase {
  // Helper to generate a title from contexts or fall back to first message
  // This is now deprecated in favor of AI-based titling.
  // We keep it as a fallback if AI titling fails or is disabled.
  private async _updateThreadTitle(client: any, threadId: string): Promise<void> {
    // Check if thread already has a title before proceeding
    const thread = await client.query('SELECT title FROM chat_threads WHERE thread_id = $1', [threadId]);
    if (thread.rows[0]?.title) {
      return; // Don't overwrite an existing title
    }

    const titleQuery = `
      WITH thread_info AS (
        SELECT
          contexts,
          (SELECT SUBSTRING(content, 1, 100) FROM chat_messages WHERE thread_id = $1 AND role = 'user' ORDER BY created_at ASC LIMIT 1) as first_message
        FROM chat_threads
        WHERE thread_id = $1
      )
      UPDATE chat_threads
      SET title = (
        SELECT
          CASE
            WHEN jsonb_array_length(contexts) > 0 THEN
              'Chat about ' || (
                SELECT string_agg(DISTINCT elem->>'id', ', ')
                FROM jsonb_array_elements(contexts) AS elem
              )
            ELSE
              first_message
          END
        FROM thread_info
      )
      WHERE thread_id = $1 AND title IS NULL
    `;
    await client.query(titleQuery, [threadId]);
  }

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

  // Add a browsing context to a thread
  async addContextToThread(threadId: string, userId: string, context: { type: string; id: string }): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const query = `
        UPDATE chat_threads
        SET contexts = contexts || $3::jsonb, updated_at = NOW()
        WHERE thread_id = $1 AND user_id = $2
        AND (jsonb_array_length(contexts) = 0 OR (contexts->-1->>'type' != $4 OR contexts->-1->>'id' != $5))
      `;
      const newContext = { ...context, timestamp: new Date().toISOString() };
      await client.query(query, [threadId, userId, JSON.stringify(newContext), context.type, context.id]);
      await this._updateThreadTitle(client, threadId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Save tool result payload and return the UUID
  // Private method that requires a transactional client to ensure atomicity
  private async _saveToolResult(
    client: any,
    threadId: string,
    messageId: string,
    userId: string,
    toolName: string,
    resultData: any
  ): Promise<string> {
    const result = await client.query(
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

  // Conditionally generate a title for the thread
  public async conditionallyGenerateTitle(threadId: string): Promise<void> {
    const client = await pool.connect();
    try {
      const threadResult = await client.query(
        'SELECT title, message_count, title_generated_at_message_count FROM chat_threads WHERE thread_id = $1',
        [threadId]
      );

      if (threadResult.rows.length === 0) {
        return;
      }

      const thread = threadResult.rows[0];
      const shouldGenerateFirstTitle =
        !thread.title && thread.message_count >= config.COPILOT_TITLE_GENERATION_THRESHOLD;
      const shouldUpdateTitle =
        thread.title &&
        (thread.message_count - thread.title_generated_at_message_count) >= config.COPILOT_TITLE_UPDATE_THRESHOLD;

      if (shouldGenerateFirstTitle || shouldUpdateTitle) {
        logger.info({
          message: `Triggering title ${shouldUpdateTitle ? 'update' : 'generation'} for thread`,
          threadId,
        });

        const messagesResult = await client.query<ChatMessage>(
          "SELECT role, content FROM chat_messages WHERE thread_id = $1 AND role IN ('user', 'assistant') ORDER BY created_at ASC LIMIT 8",
          [threadId]
        );

        const newTitle = await generateTitleForChat(messagesResult.rows);

        if (newTitle) {
          await client.query(
            'UPDATE chat_threads SET title = $1, title_generated_at_message_count = $2, updated_at = NOW() WHERE thread_id = $3',
            [newTitle, thread.message_count, threadId]
          );
          logger.info({ message: 'Successfully generated and saved new title', threadId, title: newTitle });
        } else {
          // If title generation fails, try the old method as a fallback
          await this._updateThreadTitle(client, threadId);
        }
      }
    } catch (error: any) {
      logger.error({ message: 'Error in conditionallyGenerateTitle', threadId, error: error.message });
    } finally {
      client.release();
    }
  }

  // Save messages from a request
  async saveMessages(
    threadId: string,
    userId: string,
    messages: any[],
    model?: string,
    incrementalInputTokens?: number,
    tokenBreakdown?: {
      systemPromptTokens: number;
      toolDefinitionTokens: number;
      historyTokens: number;
      toolResultTokens: number;
      userMessageTokens: number;
    },
    toolUsage?: Map<string, { tokens: number; executionTime?: number }>
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

      // Check if a system message already exists for this thread
      const systemMessageExists = await client.query(
        `SELECT 1 FROM chat_messages WHERE thread_id = $1 AND role = 'system' LIMIT 1`,
        [threadId]
      );
      const hasSystemMessage = systemMessageExists.rows.length > 0;

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

            const toolResultId = await this._saveToolResult(
              client,
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

        // Save first system message but skip subsequent ones
        // (they're repeated with every API request but only the first one is interesting)
        if (msg.role === 'system' && hasSystemMessage) {
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

          // Attribute incremental tokens to messages in this turn
          // Input tokens go to user message, output tokens to assistant message
          let inputTokensForMessage = 0;
          let outputTokensForMessage = 0;
          let systemPromptTokensForMessage: number | null = null;
          let toolDefinitionTokensForMessage: number | null = null;
          let historyTokensForMessage: number | null = null;
          let toolResultTokensForMessage: number | null = null;
          let userMessageTokensForMessage: number | null = null;

          // Find the last user message to attribute input tokens and breakdown
          const lastUserMessage = messagesToSave.slice().reverse().find(m => m.role === 'user');
          if (msg.role === 'user' && msg.id === lastUserMessage?.id && incrementalInputTokens) {
            inputTokensForMessage = incrementalInputTokens;

            // Add breakdown for user messages
            if (tokenBreakdown) {
              systemPromptTokensForMessage = tokenBreakdown.systemPromptTokens;
              toolDefinitionTokensForMessage = tokenBreakdown.toolDefinitionTokens;
              historyTokensForMessage = tokenBreakdown.historyTokens;
              toolResultTokensForMessage = tokenBreakdown.toolResultTokens;
              userMessageTokensForMessage = tokenBreakdown.userMessageTokens;
            }
          }

          // Output tokens will be set after we count them (done in onAfterRequest)
          // For now, store them as metadata on the message object
          if (msg.role === 'assistant' && (msg as any)._outputTokens) {
            outputTokensForMessage = (msg as any)._outputTokens;
          }

          const result = await client.query(`
            INSERT INTO chat_messages (thread_id, role, content, copilot_message_id, message_type, raw_message, tool_result_id, input_tokens, output_tokens, system_prompt_tokens, tool_definition_tokens, history_tokens, tool_result_tokens, user_message_tokens)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (thread_id, copilot_message_id) DO NOTHING
            RETURNING id
          `, [
            threadId,
            msg.role || null,
            contentValue,
            msg.id,
            msg.constructor?.name || msg.type || 'Unknown',
            rawMessageValue,
            (msg as any).toolResultId || null,
            inputTokensForMessage,
            outputTokensForMessage,
            systemPromptTokensForMessage,
            toolDefinitionTokensForMessage,
            historyTokensForMessage,
            toolResultTokensForMessage,
            userMessageTokensForMessage,
          ]);

          // Store message database ID for tool invocation tracking
          if (result.rows.length > 0 && msg.role === 'user' && msg.id === lastUserMessage?.id) {
            (msg as any)._dbId = result.rows[0].id;
          }
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

      // Save tool invocations if provided
      if (toolUsage && toolUsage.size > 0) {
        const lastUserMessage = messagesToSave.slice().reverse().find(m => m.role === 'user');
        const messageDbId = (lastUserMessage as any)?._dbId;

        if (messageDbId) {
          for (const [toolName, usage] of toolUsage.entries()) {
            try {
              await client.query(`
                INSERT INTO tool_invocations (thread_id, message_id, tool_name, result_tokens, execution_time_ms)
                VALUES ($1, $2, $3, $4, $5)
              `, [
                threadId,
                messageDbId,
                toolName,
                usage.tokens,
                usage.executionTime || null,
              ]);

              logger.info({
                message: 'Tool invocation tracked',
                threadId,
                messageId: messageDbId,
                toolName,
                tokens: usage.tokens,
              });
            } catch (toolError: any) {
              logger.error({
                message: 'Failed to save tool invocation',
                threadId,
                toolName,
                error: toolError.message,
              });
            }
          }
        }
      }

      // Update thread stats
      await client.query(`
        UPDATE chat_threads SET message_count = (
          SELECT COUNT(*) FROM chat_messages WHERE thread_id = $1)
        WHERE thread_id = $1
      `, [threadId]);

      // Update title before commit to keep it atomic
      await this._updateThreadTitle(client, threadId);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // After saving messages, trigger title generation asynchronously.
    // This is a "fire and forget" call to avoid blocking the response.
    this.conditionallyGenerateTitle(threadId).catch(error => {
      logger.error({ message: 'Background title generation failed', threadId, error: error.message });
    });
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
        model,
        contexts
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

  // Delete thread as admin (no user check)
  async deleteThreadAsAdmin(threadId: string): Promise<void> {
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

  // Upsert user information
  async upsertUser(user: User): Promise<void> {
    const { userId, email, name } = user;
    const query = `
      INSERT INTO users (user_id, email, name, last_seen_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        email = COALESCE($2, users.email),
        name = COALESCE($3, users.name),
        last_seen_at = NOW()
    `;
    await pool.query(query, [userId, email, name]);
  }

  // Get a single user by ID
  async getUser(userId: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT user_id as "userId", email, name, role, allow_admin_viewing as "allowAdminViewing" FROM users WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  // Update a user's privacy preference
  async updateUserPrivacy(userId: string, allowAdminViewing: boolean): Promise<void> {
    await pool.query('UPDATE users SET allow_admin_viewing = $1 WHERE user_id = $2', [allowAdminViewing, userId]);
  }

  // Update a user's role
  async updateUserRole(userId: string, role: 'user' | 'viewer' | 'admin'): Promise<void> {
    await pool.query('UPDATE users SET role = $1 WHERE user_id = $2', [role, userId]);
  }

  // Save feedback
  async saveFeedback(feedback: Feedback): Promise<void> {
    const { userId, threadId, messageId, source, rating, feedbackText, metadata } = feedback;
    const query = `
      INSERT INTO chat_feedback (user_id, thread_id, message_id, source, rating, feedback_text, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    await pool.query(query, [userId, threadId, messageId, source, rating, feedbackText, metadata ? JSON.stringify(metadata) : null]);
  }

  // Get users with pagination
  async getUsers(limit = 50, offset = 0): Promise<any[]> {
    const query = `
      SELECT
        user_id as "userId",
        email,
        name,
        role,
        created_at as "createdAt",
        last_seen_at as "lastSeenAt"
      FROM users
      ORDER BY last_seen_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  // Get feedback with pagination
  async getFeedback(limit = 50, offset = 0): Promise<any[]> {
    const query = `
      SELECT
        f.id,
        f.created_at as "createdAt",
        f.user_id as "userId",
        u.email as "userEmail",
        u.name as "userName",
        f.thread_id as "threadId",
        t.title as "threadTitle",
        f.message_id as "messageId",
        f.source,
        f.rating,
        f.feedback_text as "feedbackText",
        f.metadata
      FROM chat_feedback f
      LEFT JOIN chat_threads t ON f.thread_id = t.thread_id
      LEFT JOIN users u ON f.user_id = u.user_id
      ORDER BY f.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  // Get all threads for admin view, respecting user privacy
  async getAllThreadsForAdmin(limit = 50, offset = 0): Promise<any[]> {
    const query = `
      SELECT
        t.id,
        t.thread_id as "threadId",
        t.title,
        t.created_at as "createdAt",
        t.updated_at as "updatedAt",
        t.message_count as "messageCount",
        t.total_input_tokens as "totalInputTokens",
        t.total_output_tokens as "totalOutputTokens",
        t.total_request_tokens as "totalRequestTokens",
        t.model,
        t.contexts,
        u.user_id as "userId",
        u.email as "userEmail",
        u.name as "userName"
      FROM chat_threads t
      JOIN users u ON t.user_id = u.user_id
      WHERE u.allow_admin_viewing = TRUE
      ORDER BY t.updated_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  // Get messages for a thread for admin view, checking privacy first
  async getMessagesForAdmin(threadId: string): Promise<ChatMessage[] | null> {
    const privacyCheck = await pool.query(`
      SELECT u.allow_admin_viewing
      FROM users u
      JOIN chat_threads t ON u.user_id = t.user_id
      WHERE t.thread_id = $1
    `, [threadId]);

    if (privacyCheck.rows.length === 0 || !privacyCheck.rows[0].allow_admin_viewing) {
      return null; // User has opted out or thread not found
    }

    const result = await pool.query(`
      SELECT
        m.id,
        m.thread_id as "threadId",
        m.role,
        m.content,
        m.created_at as "createdAt",
        m.input_tokens as "inputTokens",
        m.output_tokens as "outputTokens",
        m.system_prompt_tokens as "systemPromptTokens",
        m.tool_definition_tokens as "toolDefinitionTokens",
        m.history_tokens as "historyTokens",
        m.user_message_tokens as "userMessageTokens",
        m.message_type as "messageType",
        m.raw_message as "rawMessage"
      FROM chat_messages m
      WHERE m.thread_id = $1
      ORDER BY m.created_at ASC, m.sequence_number ASC
    `, [threadId]);

    return result.rows;
  }

  // === ANALYTICS METHODS ===

  // Save an analytics event
  async saveAnalyticsEvent(event: {
    userId?: string;
    threadId?: string;
    eventType: string;
    payload?: Record<string, any>;
    sessionId?: string;
  }): Promise<void> {
    const { userId, threadId, eventType, payload, sessionId } = event;
    const query = `
      INSERT INTO analytics_events (user_id, thread_id, event_type, payload, session_id)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(query, [
      userId || null,
      threadId || null,
      eventType,
      payload ? JSON.stringify(payload) : null,
      sessionId || null,
    ]);
  }

  // Get statistics for admin view
  async getUsageStats(): Promise<any> {
    const query = `
      WITH thread_stats AS (
        SELECT
          model,
          COUNT(DISTINCT thread_id) AS total_threads,
          COUNT(DISTINCT user_id) AS total_users,
          -- Use total_request_tokens if available, fallback to total_input_tokens for old data
          SUM(COALESCE(total_request_tokens, total_input_tokens, 0)) AS total_request_tokens,
          SUM(total_output_tokens) AS total_output_tokens
        FROM chat_threads
        WHERE model IS NOT NULL
        GROUP BY model
      ),
      message_stats AS (
        SELECT
          t.model,
          COUNT(m.id) AS total_messages,
          SUM(m.system_prompt_tokens) AS total_system_prompt_tokens,
          SUM(m.tool_definition_tokens) AS total_tool_definition_tokens,
          SUM(m.history_tokens) AS total_history_tokens,
          SUM(m.user_message_tokens) AS total_user_message_tokens
        FROM chat_messages m
        JOIN chat_threads t ON m.thread_id = t.thread_id
        WHERE t.model IS NOT NULL
        GROUP BY t.model
      )
      SELECT
        ts.model,
        ts.total_threads,
        ts.total_users,
        COALESCE(ms.total_messages, 0) AS total_messages,
        ts.total_request_tokens,
        ts.total_output_tokens,
        COALESCE(ms.total_system_prompt_tokens, 0) AS total_system_prompt_tokens,
        COALESCE(ms.total_tool_definition_tokens, 0) AS total_tool_definition_tokens,
        COALESCE(ms.total_history_tokens, 0) AS total_history_tokens,
        COALESCE(ms.total_user_message_tokens, 0) AS total_user_message_tokens
      FROM thread_stats ts
      LEFT JOIN message_stats ms ON ts.model = ms.model
      ORDER BY ts.total_request_tokens DESC;
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Get suggestion click statistics
  async getSuggestionStats(limit = 20): Promise<any[]> {
    const query = `
      SELECT
        payload->>'title' as suggestion_title,
        payload->>'message' as suggestion_message,
        COUNT(*) as click_count
      FROM analytics_events
      WHERE event_type = 'suggestion_click'
      GROUP BY payload->>'title', payload->>'message'
      ORDER BY click_count DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  // Update token usage for a thread
  async getThreadTokens(threadId: string): Promise<{ total_input_tokens: number; total_output_tokens: number } | null> {
    const result = await pool.query(
      `SELECT total_input_tokens, total_output_tokens FROM chat_threads WHERE thread_id = $1`,
      [threadId]
    );
    return result.rows[0] || null;
  }

  async updateThreadTokenUsage(
    threadId: string,
    inputTokens: number,
    outputTokens: number,
    requestTokens?: number
  ): Promise<void> {
    await pool.query(
      `UPDATE chat_threads
       SET total_input_tokens = COALESCE(total_input_tokens, 0) + $1,
           total_output_tokens = COALESCE(total_output_tokens, 0) + $2,
           total_request_tokens = COALESCE(total_request_tokens, 0) + $3
       WHERE thread_id = $4`,
      [inputTokens, outputTokens, requestTokens || 0, threadId]
    );
  }
}

export const chatDb = new ChatDatabase();
