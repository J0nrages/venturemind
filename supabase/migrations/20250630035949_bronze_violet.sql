/*
  # AI Document Memory System

  1. New Tables
    - `document_templates` - Pre-configured business document templates
    - `user_documents` - User's personal and business documents
    - `conversation_messages` - Chat messages between user and AI
    - `document_memories` - Contextual memories linked to documents
    - `personal_categories` - User-defined personal document categories

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Document templates for business use
CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  template_content text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  icon text NOT NULL DEFAULT 'FileText',
  description text,
  created_at timestamptz DEFAULT now()
);

-- User documents (both personal and business)
CREATE TABLE IF NOT EXISTS user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  content text NOT NULL,
  category text NOT NULL CHECK (category IN ('personal', 'business')),
  subcategory text,
  template_id uuid REFERENCES document_templates(id),
  is_template_based boolean DEFAULT false,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Conversation messages
CREATE TABLE IF NOT EXISTS conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  content text NOT NULL,
  sender text NOT NULL CHECK (sender IN ('user', 'ai')),
  document_updates text[] DEFAULT '{}',
  context_confidence numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Document memories (AI-extracted information)
CREATE TABLE IF NOT EXISTS document_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  document_id uuid REFERENCES user_documents(id) ON DELETE CASCADE NOT NULL,
  memory_content text NOT NULL,
  context text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  source_message_id uuid REFERENCES conversation_messages(id),
  created_at timestamptz DEFAULT now()
);

-- Personal categories for organization
CREATE TABLE IF NOT EXISTS personal_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_categories ENABLE ROW LEVEL SECURITY;

-- Document templates are public (read-only)
CREATE POLICY "Document templates are viewable by all authenticated users"
  ON document_templates FOR SELECT
  TO authenticated
  USING (true);

-- User documents policies
CREATE POLICY "Users can manage their own documents"
  ON user_documents FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Conversation messages policies
CREATE POLICY "Users can manage their own messages"
  ON conversation_messages FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Document memories policies
CREATE POLICY "Users can manage their own memories"
  ON document_memories FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Personal categories policies
CREATE POLICY "Users can manage their own categories"
  ON personal_categories FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_documents_user_category ON user_documents(user_id, category);
CREATE INDEX idx_conversation_messages_user_created ON conversation_messages(user_id, created_at);
CREATE INDEX idx_document_memories_document ON document_memories(document_id);
CREATE INDEX idx_document_memories_user ON document_memories(user_id);

-- Insert default document templates
INSERT INTO document_templates (name, category, template_content, keywords, icon, description) VALUES
(
  'Product Requirements Document',
  'product',
  E'# Product Requirements Document\n\n## Overview\n[Product description and objectives]\n\n## User Stories\n[Key user stories and acceptance criteria]\n\n## Technical Requirements\n[Technical specifications and constraints]\n\n## Success Metrics\n[KPIs and measurement criteria]\n\n## Timeline\n[Development milestones and deadlines]',
  ARRAY['product', 'feature', 'requirement', 'user story', 'specification', 'roadmap'],
  'Target',
  'Document for defining product features and requirements'
),
(
  'Technical Specification',
  'engineering',
  E'# Technical Specification\n\n## Architecture Overview\n[System architecture and design patterns]\n\n## API Specifications\n[Endpoint definitions and data schemas]\n\n## Database Design\n[Schema and relationships]\n\n## Performance Requirements\n[Scalability and performance benchmarks]\n\n## Security Considerations\n[Security requirements and implementation]',
  ARRAY['technical', 'architecture', 'api', 'database', 'performance', 'security', 'implementation'],
  'Code',
  'Technical documentation for system architecture and implementation'
),
(
  'Financial Model',
  'finance',
  E'# Financial Model\n\n## Revenue Projections\n[Revenue streams and forecasting]\n\n## Cost Structure\n[Operating expenses and cost analysis]\n\n## Funding Requirements\n[Capital needs and investment timeline]\n\n## Key Metrics\n[Financial KPIs and benchmarks]\n\n## Risk Analysis\n[Financial risks and mitigation strategies]',
  ARRAY['financial', 'revenue', 'cost', 'funding', 'investment', 'budget', 'metrics'],
  'DollarSign',
  'Financial planning and analysis documentation'
),
(
  'Strategic Plan',
  'strategy',
  E'# Strategic Plan\n\n## Vision & Mission\n[Company vision and mission statements]\n\n## Market Analysis\n[Market size, competition, and opportunities]\n\n## Strategic Objectives\n[Key goals and initiatives]\n\n## Action Plan\n[Implementation roadmap and milestones]\n\n## Success Metrics\n[Strategic KPIs and measurement]',
  ARRAY['strategy', 'vision', 'mission', 'market', 'competition', 'objectives', 'growth'],
  'BarChart3',
  'Strategic planning and business development documentation'
),
(
  'Team Documentation',
  'operations',
  E'# Team Documentation\n\n## Team Structure\n[Organizational chart and roles]\n\n## Processes & Workflows\n[Standard operating procedures]\n\n## Communication Guidelines\n[Meeting cadence and communication protocols]\n\n## Performance Metrics\n[Team KPIs and evaluation criteria]\n\n## Training & Development\n[Skill development and training plans]',
  ARRAY['team', 'organization', 'process', 'workflow', 'communication', 'performance', 'training'],
  'Users',
  'Team organization and operational procedures'
),
(
  'Marketing Plan',
  'marketing',
  E'# Marketing Plan\n\n## Target Audience\n[Customer personas and segments]\n\n## Marketing Channels\n[Channel strategy and tactics]\n\n## Campaign Timeline\n[Marketing calendar and milestones]\n\n## Budget Allocation\n[Marketing spend and resource allocation]\n\n## Success Metrics\n[Marketing KPIs and ROI measurement]',
  ARRAY['marketing', 'campaign', 'audience', 'brand', 'content', 'social', 'advertising'],
  'Megaphone',
  'Marketing strategy and campaign planning'
);