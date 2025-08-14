-- Add context and agent management preferences to user_settings
-- This migration extends user settings to include:
-- - Context management preferences
-- - Agent activation settings  
-- - UI preferences
-- Uses existing conversation_threads table for contexts

-- Extend user_settings table with new columns
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS context_preferences jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS agent_preferences jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ui_preferences jsonb DEFAULT '{}';

-- Extend conversation_threads to support our context features
ALTER TABLE conversation_threads
ADD COLUMN IF NOT EXISTS type text DEFAULT 'conversation',
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS color jsonb DEFAULT '{"primary": "#6366F1", "secondary": "#E0E7FF", "accent": "#4F46E5"}',
ADD COLUMN IF NOT EXISTS active_agent_ids text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS surface_config jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_thread_id uuid REFERENCES conversation_threads(id);

-- Add default context and agent preference structures as comments for reference:
/*
context_preferences structure:
{
  "auto_create_contexts": true,
  "default_context_type": "conversation",
  "max_contexts": 10,
  "context_switching_hotkeys": true,
  "show_context_suggestions": true
}

agent_preferences structure:
{
  "auto_activate_agents": true,
  "confidence_threshold": 30,
  "max_active_agents": 5,
  "preferred_agents": ["engineer", "writer"],
  "agent_suggestions": true,
  "agent_notifications": true
}

ui_preferences structure:
{
  "sidebar_position": "right",
  "expanded_mode": "compact",
  "show_agent_badges": true,
  "show_confidence_scores": true,
  "theme": "system"
}
*/