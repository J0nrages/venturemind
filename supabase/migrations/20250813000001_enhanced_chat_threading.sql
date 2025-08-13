-- Enhanced chat threading with archive, reply, and branching capabilities
-- Migration: Enhanced Chat Threading System

-- Add new columns to conversation_messages table
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS thread_id uuid DEFAULT gen_random_uuid();
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS parent_message_id uuid REFERENCES conversation_messages(id) ON DELETE CASCADE;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS reply_to_message_id uuid REFERENCES conversation_messages(id) ON DELETE CASCADE;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS branch_context text;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS quoted_text text;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS thread_title text;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS thread_title_status text DEFAULT 'pending' CHECK (thread_title_status IN ('pending', 'processing', 'completed', 'failed'));
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS thread_summary text;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS summarization_job_id uuid;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS message_order integer DEFAULT 0;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_messages_thread_id ON conversation_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_parent_id ON conversation_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_reply_to ON conversation_messages(reply_to_message_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_archived ON conversation_messages(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_messages_thread_order ON conversation_messages(thread_id, message_order);

-- Create thread metadata table for better organization
CREATE TABLE IF NOT EXISTS conversation_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  root_message_id uuid REFERENCES conversation_messages(id) ON DELETE CASCADE,
  title text,
  summary text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'merged')),
  participant_count integer DEFAULT 1,
  message_count integer DEFAULT 0,
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for thread metadata
CREATE INDEX IF NOT EXISTS idx_conversation_threads_user_id ON conversation_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_activity ON conversation_threads(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_status ON conversation_threads(status);

-- Create thread participants table for multi-user threads
CREATE TABLE IF NOT EXISTS thread_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES conversation_threads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'participant' CHECK (role IN ('owner', 'participant', 'viewer')),
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

-- Row Level Security for new tables
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_threads
CREATE POLICY "Users can view their own threads"
  ON conversation_threads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own threads"
  ON conversation_threads FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own threads"
  ON conversation_threads FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for thread_participants
CREATE POLICY "Users can view threads they participate in"
  ON thread_participants FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Thread owners can manage participants"
  ON thread_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversation_threads ct 
      WHERE ct.id = thread_id AND ct.user_id = auth.uid()
    )
  );

-- Function to automatically create thread metadata
CREATE OR REPLACE FUNCTION create_thread_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a root message (no parent), create thread metadata
  IF NEW.parent_message_id IS NULL AND NEW.thread_id IS NOT NULL THEN
    INSERT INTO conversation_threads (
      id,
      user_id,
      root_message_id,
      title,
      message_count,
      last_activity_at
    ) VALUES (
      NEW.thread_id,
      NEW.user_id,
      NEW.id,
      COALESCE(NEW.thread_title, 'New Conversation'),
      1,
      NEW.created_at
    ) ON CONFLICT (id) DO UPDATE SET
      message_count = conversation_threads.message_count + 1,
      last_activity_at = NEW.created_at;
    
    -- Add user as thread participant
    INSERT INTO thread_participants (thread_id, user_id, role)
    VALUES (NEW.thread_id, NEW.user_id, 'owner')
    ON CONFLICT (thread_id, user_id) DO UPDATE SET
      last_read_at = NEW.created_at;
  ELSE
    -- Update existing thread metadata
    UPDATE conversation_threads 
    SET 
      message_count = message_count + 1,
      last_activity_at = NEW.created_at,
      updated_at = NEW.created_at
    WHERE id = NEW.thread_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create thread metadata
DROP TRIGGER IF EXISTS trigger_create_thread_metadata ON conversation_messages;
CREATE TRIGGER trigger_create_thread_metadata
  AFTER INSERT ON conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION create_thread_metadata();

-- Function to update thread title when summarization completes
CREATE OR REPLACE FUNCTION update_thread_title()
RETURNS TRIGGER AS $$
BEGIN
  -- If thread title was updated and status is completed
  IF NEW.thread_title IS DISTINCT FROM OLD.thread_title 
     AND NEW.thread_title_status = 'completed' THEN
    
    UPDATE conversation_threads 
    SET 
      title = NEW.thread_title,
      summary = NEW.thread_summary,
      updated_at = now()
    WHERE id = NEW.thread_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync thread title updates
DROP TRIGGER IF EXISTS trigger_update_thread_title ON conversation_messages;
CREATE TRIGGER trigger_update_thread_title
  AFTER UPDATE ON conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_title();

-- Populate thread_id for existing messages (migration helper)
UPDATE conversation_messages 
SET thread_id = gen_random_uuid() 
WHERE thread_id IS NULL;

-- Set message_order for existing messages
WITH ordered_messages AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY thread_id ORDER BY created_at) as order_num
  FROM conversation_messages
  WHERE message_order = 0
)
UPDATE conversation_messages 
SET message_order = ordered_messages.order_num
FROM ordered_messages
WHERE conversation_messages.id = ordered_messages.id;