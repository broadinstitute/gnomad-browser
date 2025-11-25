-- Chat threads (conversations)
CREATE TABLE chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id VARCHAR(255) UNIQUE NOT NULL,  -- CopilotKit's threadId
  title VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Analytics fields
  message_count INTEGER DEFAULT 0,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  model VARCHAR(100),

  -- Optional user tracking (for future)
  user_id VARCHAR(255),
  session_id VARCHAR(255),

  -- Browsing context
  contexts JSONB DEFAULT '[]'::jsonb NOT NULL,

  -- Auto-titling metadata
  title_generated_at_message_count INTEGER DEFAULT 0
);

-- Individual messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id VARCHAR(255) NOT NULL REFERENCES chat_threads(thread_id) ON DELETE CASCADE,

  -- Message content
  role VARCHAR(50),  -- 'user', 'assistant', 'system'
  content TEXT,

  -- CopilotKit message metadata
  copilot_message_id VARCHAR(255),
  message_type VARCHAR(100),  -- 'TextMessage', 'ActionExecutionMessage', etc.

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Analytics
  input_tokens INTEGER,
  output_tokens INTEGER,

  -- Store full message object for debugging
  raw_message JSONB,

  -- Reference to large tool result payload
  tool_result_id UUID,

  -- Unique constraint to prevent duplicate messages
  CONSTRAINT unique_copilot_message UNIQUE (thread_id, copilot_message_id)
);

-- Tool result payloads (for large structured data)
CREATE TABLE tool_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    tool_name VARCHAR(255) NOT NULL,
    result_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_thread FOREIGN KEY (thread_id) REFERENCES chat_threads(thread_id) ON DELETE CASCADE,
    UNIQUE(thread_id, message_id)
);

-- Add foreign key from chat_messages to tool_results
ALTER TABLE chat_messages ADD CONSTRAINT fk_tool_result FOREIGN KEY (tool_result_id) REFERENCES tool_results(id) ON DELETE SET NULL;

-- Indexes for common queries
CREATE INDEX idx_threads_updated ON chat_threads(updated_at DESC);
CREATE INDEX idx_threads_user ON chat_threads(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_messages_thread ON chat_messages(thread_id, created_at);
CREATE INDEX idx_messages_created ON chat_messages(created_at DESC);
CREATE INDEX idx_threads_contexts ON chat_threads USING gin(contexts);
CREATE INDEX idx_tool_results_user ON tool_results(user_id);

-- Analytics views
CREATE VIEW chat_analytics AS
SELECT
  DATE_TRUNC('day', m.created_at) as day,
  COUNT(DISTINCT m.thread_id) as threads,
  COUNT(*) as messages,
  SUM(m.input_tokens) as total_input_tokens,
  SUM(m.output_tokens) as total_output_tokens,
  t.model
FROM chat_messages m
JOIN chat_threads t ON m.thread_id = t.thread_id
GROUP BY DATE_TRUNC('day', m.created_at), t.model;
