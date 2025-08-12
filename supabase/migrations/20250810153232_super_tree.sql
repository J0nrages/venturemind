/*
  # Add Real-time Collaboration Features

  1. New Tables
    - `document_sessions` - Track active editing sessions
    - `document_presence` - Track who's currently viewing/editing
    - `document_operations` - Store operational transformations for conflict resolution
    - `collaboration_events` - Real-time events for document changes

  2. Enhanced Tables
    - Add real-time fields to existing `user_documents`
    - Add collaboration metadata to `doc_sections`

  3. Security
    - Enable RLS on all new tables
    - Add policies for collaborative access
    - Ensure users can only access documents they have permission for
*/

-- Add collaboration fields to user_documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_documents' AND column_name = 'is_collaborative'
  ) THEN
    ALTER TABLE user_documents ADD COLUMN is_collaborative boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_documents' AND column_name = 'version'
  ) THEN
    ALTER TABLE user_documents ADD COLUMN version integer DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_documents' AND column_name = 'last_editor_id'
  ) THEN
    ALTER TABLE user_documents ADD COLUMN last_editor_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Document editing sessions
CREATE TABLE IF NOT EXISTS document_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES user_documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'idle', 'disconnected')),
  cursor_position jsonb DEFAULT '{}',
  selection_range jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  started_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sessions"
  ON document_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view sessions for their documents"
  ON document_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_documents 
      WHERE user_documents.id = document_sessions.document_id 
      AND user_documents.user_id = auth.uid()
    )
  );

-- Document presence tracking
CREATE TABLE IF NOT EXISTS document_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES user_documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  status text NOT NULL DEFAULT 'viewing' CHECK (status IN ('viewing', 'editing', 'idle')),
  cursor_position jsonb DEFAULT '{}',
  selection_range jsonb DEFAULT '{}',
  user_info jsonb DEFAULT '{}',
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(document_id, user_id, session_id)
);

ALTER TABLE document_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own presence"
  ON document_presence
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view presence for accessible documents"
  ON document_presence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_documents 
      WHERE user_documents.id = document_presence.document_id 
      AND user_documents.user_id = auth.uid()
    )
  );

-- Document operations for conflict resolution
CREATE TABLE IF NOT EXISTS document_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES user_documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  operation_type text NOT NULL CHECK (operation_type IN ('insert', 'delete', 'retain', 'format')),
  operation_data jsonb NOT NULL,
  position_start integer NOT NULL DEFAULT 0,
  position_end integer NOT NULL DEFAULT 0,
  applied_at timestamptz DEFAULT now(),
  version_before integer NOT NULL,
  version_after integer NOT NULL,
  checksum text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage operations for their documents"
  ON document_operations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_documents 
      WHERE user_documents.id = document_operations.document_id 
      AND user_documents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_documents 
      WHERE user_documents.id = document_operations.document_id 
      AND user_documents.user_id = auth.uid()
    )
  );

-- Collaboration events for real-time sync
CREATE TABLE IF NOT EXISTS collaboration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES user_documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('join', 'leave', 'edit', 'cursor_move', 'selection_change', 'comment')),
  event_data jsonb NOT NULL DEFAULT '{}',
  broadcast_to jsonb DEFAULT '[]', -- Array of user IDs to broadcast to
  created_at timestamptz DEFAULT now()
);

ALTER TABLE collaboration_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create events for accessible documents"
  ON collaboration_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_documents 
      WHERE user_documents.id = collaboration_events.document_id 
      AND user_documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view events for accessible documents"
  ON collaboration_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_documents 
      WHERE user_documents.id = collaboration_events.document_id 
      AND user_documents.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_sessions_document_user ON document_sessions(document_id, user_id);
CREATE INDEX IF NOT EXISTS idx_document_sessions_status ON document_sessions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_document_presence_document ON document_presence(document_id);
CREATE INDEX IF NOT EXISTS idx_document_presence_last_seen ON document_presence(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_document_operations_document_version ON document_operations(document_id, version_after);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_document ON collaboration_events(document_id, created_at);

-- Add collaboration metadata to doc_sections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'doc_sections' AND column_name = 'last_editor_id'
  ) THEN
    ALTER TABLE doc_sections ADD COLUMN last_editor_id uuid REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'doc_sections' AND column_name = 'version'
  ) THEN
    ALTER TABLE doc_sections ADD COLUMN version integer DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'doc_sections' AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE doc_sections ADD COLUMN is_locked boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'doc_sections' AND column_name = 'locked_by'
  ) THEN
    ALTER TABLE doc_sections ADD COLUMN locked_by uuid REFERENCES auth.users(id);
  END IF;
END $$;