-- Chat threads (conversations)
CREATE TABLE chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id VARCHAR(255) UNIQUE NOT NULL,  -- CopilotKit's threadId
  title VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Analytics fields
  message_count INTEGER DEFAULT 0,
  total_input_tokens INTEGER DEFAULT 0,        -- Cumulative incremental input tokens (new tokens per turn)
  total_output_tokens INTEGER DEFAULT 0,       -- Cumulative output tokens
  total_request_tokens BIGINT DEFAULT 0,       -- Cumulative sum of full request sizes (all API calls)
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

  -- Detailed token breakdown (for user messages)
  system_prompt_tokens INTEGER,
  tool_definition_tokens INTEGER,
  history_tokens INTEGER,
  user_message_tokens INTEGER,
  tool_result_tokens INTEGER,  -- Tokens consumed by tool results in this request

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

-- User Roles Enum
CREATE TYPE user_role AS ENUM ('user', 'viewer', 'admin');

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

-- Users table for storing user information
CREATE TABLE users (
  user_id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255),
  name VARCHAR(255),
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  allow_admin_viewing BOOLEAN NOT NULL DEFAULT TRUE
);

-- Index for email lookups
CREATE INDEX idx_users_email ON users(email);

-- User Feedback
CREATE TABLE chat_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE SET NULL, -- Foreign key to users table
  thread_id VARCHAR(255) REFERENCES chat_threads(thread_id) ON DELETE SET NULL,
  message_id VARCHAR(255), -- The ID of the message being rated
  source VARCHAR(50) NOT NULL, -- 'message', 'thread', or 'general'
  rating INT, -- 1 for positive (thumbs up), -1 for negative (thumbs down)
  feedback_text TEXT,
  metadata JSONB -- To store contextual info like the model used
);

-- Indexes for feedback queries
CREATE INDEX idx_feedback_thread ON chat_feedback(thread_id);
CREATE INDEX idx_feedback_user ON chat_feedback(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_feedback_source ON chat_feedback(source);

-- Tool Invocations (for per-tool usage tracking and analytics)
CREATE TABLE tool_invocations (
  id SERIAL PRIMARY KEY,
  thread_id VARCHAR(255) REFERENCES chat_threads(thread_id) ON DELETE CASCADE,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  result_tokens INTEGER,
  execution_time_ms INTEGER,
  arguments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tool usage queries
CREATE INDEX idx_tool_invocations_thread ON tool_invocations(thread_id);
CREATE INDEX idx_tool_invocations_tool_name ON tool_invocations(tool_name);
CREATE INDEX idx_tool_invocations_created_at ON tool_invocations(created_at);

-- Comments for tool_invocations table
COMMENT ON TABLE tool_invocations IS 'Per-tool usage tracking for analytics and cost monitoring';
COMMENT ON COLUMN tool_invocations.tool_name IS 'Name of the MCP tool that was invoked (e.g., get_juha_credible_sets_by_gene)';
COMMENT ON COLUMN tool_invocations.result_tokens IS 'Number of tokens consumed by this tool''s output';
COMMENT ON COLUMN tool_invocations.execution_time_ms IS 'Time taken to execute the tool in milliseconds';
COMMENT ON COLUMN tool_invocations.arguments IS 'Arguments passed to the tool (for debugging and analysis)';

-- Analytics Events (for tracking user interactions)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE SET NULL,
  thread_id VARCHAR(255) REFERENCES chat_threads(thread_id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL, -- e.g., 'suggestion_click', 'search', etc.
  payload JSONB, -- Flexible storage for event-specific data
  session_id VARCHAR(255)
);

-- Indexes for analytics queries
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_user ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at DESC);
