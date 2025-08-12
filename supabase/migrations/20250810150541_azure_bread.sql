/*
  # Agentic Chat Data Model

  1. New Tables
    - `clips` - Conversation spans with topics/entities, embeddings, and provenance
    - `clip_topics` - Many-to-many relationship between clips and topics
    - `clip_entities` - Many-to-many relationship between clips and entities  
    - `doc_sections` - Targetable sections in documents for precise updates
    - `action_log` - Audit trail of conversation → tool-call → writeback actions

  2. Indexes
    - pgvector indexes for semantic search on clips
    - Performance indexes for common queries

  3. Security
    - Enable RLS on all new tables
    - Add policies for user data isolation
*/

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Clips table for conversation memory and retrieval
CREATE TABLE IF NOT EXISTS clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  topic text,
  entities text[],
  embedding vector(1536), -- OpenAI embedding size
  confidence numeric DEFAULT 0.8,
  source_type text CHECK (source_type IN ('conversation', 'document', 'external', 'system')),
  source_id text,
  provenance jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Clip topics for categorization
CREATE TABLE IF NOT EXISTS clip_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid REFERENCES clips(id) ON DELETE CASCADE NOT NULL,
  topic text NOT NULL,
  relevance_score numeric DEFAULT 1.0,
  created_at timestamptz DEFAULT now()
);

-- Clip entities for named entity tracking
CREATE TABLE IF NOT EXISTS clip_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid REFERENCES clips(id) ON DELETE CASCADE NOT NULL,
  entity_type text NOT NULL, -- person, company, product, concept, etc.
  entity_value text NOT NULL,
  confidence numeric DEFAULT 0.8,
  created_at timestamptz DEFAULT now()
);

-- Document sections for precise targeting
CREATE TABLE IF NOT EXISTS doc_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES user_documents(id) ON DELETE CASCADE NOT NULL,
  section_type text CHECK (section_type IN ('heading', 'paragraph', 'list', 'table', 'code', 'quote')),
  section_title text,
  section_content text NOT NULL,
  section_order integer DEFAULT 0,
  start_position integer,
  end_position integer,
  embedding vector(1536),
  is_targetable boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Action log for audit trail and observability
CREATE TABLE IF NOT EXISTS action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_message_id uuid REFERENCES conversation_messages(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN (
    'retrieve_context', 'suggest_actions', 'update_doc_section', 
    'create_document', 'orchestrate', 'plan', 'tool_call', 'observe'
  )),
  tool_name text,
  input_data jsonb DEFAULT '{}',
  output_data jsonb DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error_message text,
  execution_time_ms integer,
  tokens_used integer DEFAULT 0,
  cost_usd numeric DEFAULT 0,
  trace_id text, -- For langfuse integration
  parent_action_id uuid REFERENCES action_log(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clips_user_id ON clips(user_id);
CREATE INDEX IF NOT EXISTS idx_clips_source ON clips(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_clips_embedding ON clips USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_clips_created_at ON clips(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clip_topics_clip_id ON clip_topics(clip_id);
CREATE INDEX IF NOT EXISTS idx_clip_topics_topic ON clip_topics(topic);

CREATE INDEX IF NOT EXISTS idx_clip_entities_clip_id ON clip_entities(clip_id);
CREATE INDEX IF NOT EXISTS idx_clip_entities_type_value ON clip_entities(entity_type, entity_value);

CREATE INDEX IF NOT EXISTS idx_doc_sections_document_id ON doc_sections(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_sections_user_id ON doc_sections(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_sections_embedding ON doc_sections USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_doc_sections_targetable ON doc_sections(is_targetable) WHERE is_targetable = true;

CREATE INDEX IF NOT EXISTS idx_action_log_user_id ON action_log(user_id);
CREATE INDEX IF NOT EXISTS idx_action_log_conversation_id ON action_log(conversation_message_id);
CREATE INDEX IF NOT EXISTS idx_action_log_trace_id ON action_log(trace_id);
CREATE INDEX IF NOT EXISTS idx_action_log_parent_id ON action_log(parent_action_id);
CREATE INDEX IF NOT EXISTS idx_action_log_created_at ON action_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clips
CREATE POLICY "Users can manage their own clips"
  ON clips
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for clip_topics
CREATE POLICY "Users can manage topics for their clips"
  ON clip_topics
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM clips 
    WHERE clips.id = clip_topics.clip_id 
    AND clips.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM clips 
    WHERE clips.id = clip_topics.clip_id 
    AND clips.user_id = auth.uid()
  ));

-- RLS Policies for clip_entities
CREATE POLICY "Users can manage entities for their clips"
  ON clip_entities
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM clips 
    WHERE clips.id = clip_entities.clip_id 
    AND clips.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM clips 
    WHERE clips.id = clip_entities.clip_id 
    AND clips.user_id = auth.uid()
  ));

-- RLS Policies for doc_sections
CREATE POLICY "Users can manage sections for their documents"
  ON doc_sections
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for action_log
CREATE POLICY "Users can view their own action logs"
  ON action_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert action logs"
  ON action_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update action logs"
  ON action_log
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);