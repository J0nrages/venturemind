/*
  # Strategic Initiatives and Enhanced Metrics

  1. New Tables
    - `strategic_initiatives` - Trackable business initiatives and tasks
    - `swot_items` - Dynamic SWOT analysis items
    - `api_metrics` - Performance tracking for real-time metrics

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Strategic initiatives for business planning and task management
CREATE TABLE IF NOT EXISTS strategic_initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  description text,
  category text DEFAULT 'general' CHECK (category IN ('product', 'technical', 'marketing', 'business', 'general')),
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'on_hold', 'cancelled')),
  priority integer DEFAULT 2 CHECK (priority BETWEEN 1 AND 5), -- 1=highest, 5=lowest
  due_date date,
  completed_at timestamptz,
  created_by text DEFAULT 'user' CHECK (created_by IN ('user', 'ai')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- SWOT analysis items for dynamic strategic planning
CREATE TABLE IF NOT EXISTS swot_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  category text NOT NULL CHECK (category IN ('strengths', 'weaknesses', 'opportunities', 'threats')),
  title text NOT NULL,
  description text,
  priority integer DEFAULT 2 CHECK (priority BETWEEN 1 AND 5),
  source text DEFAULT 'user' CHECK (source IN ('user', 'ai', 'analysis')),
  metadata jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- API performance metrics for real-time dashboard
CREATE TABLE IF NOT EXISTS api_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  metric_type text NOT NULL, -- 'processing_time', 'api_call', 'accuracy_rate'
  value numeric NOT NULL,
  endpoint text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Revenue tracking for real-time calculations
CREATE TABLE IF NOT EXISTS revenue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('subscription_created', 'subscription_cancelled', 'payment_received', 'refund_issued')),
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  subscription_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE strategic_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE swot_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_events ENABLE ROW LEVEL SECURITY;

-- Strategic initiatives policies
CREATE POLICY "Users can manage their own strategic initiatives"
  ON strategic_initiatives FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- SWOT items policies
CREATE POLICY "Users can manage their own SWOT items"
  ON swot_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- API metrics policies
CREATE POLICY "Users can view their own API metrics"
  ON api_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert API metrics"
  ON api_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Revenue events policies
CREATE POLICY "Users can manage their own revenue events"
  ON revenue_events FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_strategic_initiatives_user_status ON strategic_initiatives(user_id, status);
CREATE INDEX idx_strategic_initiatives_due_date ON strategic_initiatives(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_swot_items_user_category ON swot_items(user_id, category);
CREATE INDEX idx_api_metrics_user_type ON api_metrics(user_id, metric_type);
CREATE INDEX idx_api_metrics_created ON api_metrics(created_at);
CREATE INDEX idx_revenue_events_user_type ON revenue_events(user_id, event_type);
CREATE INDEX idx_revenue_events_created ON revenue_events(created_at);

-- Insert default SWOT items for new users
INSERT INTO swot_items (user_id, category, title, description, priority, source) 
SELECT 
  auth.uid(),
  'strengths',
  'Advanced AI Technology',
  'State-of-the-art AI models with high accuracy and processing speed',
  1,
  'analysis'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO swot_items (user_id, category, title, description, priority, source) 
SELECT 
  auth.uid(),
  'weaknesses',
  'Market Penetration',
  'Limited market presence in competitive landscape',
  2,
  'analysis'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO swot_items (user_id, category, title, description, priority, source) 
SELECT 
  auth.uid(),
  'opportunities',
  'AI Market Growth',
  'Rapidly expanding AI and automation market demand',
  1,
  'analysis'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO swot_items (user_id, category, title, description, priority, source) 
SELECT 
  auth.uid(),
  'threats',
  'Technology Changes',
  'Rapid technological evolution and competitive threats',
  2,
  'analysis'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;