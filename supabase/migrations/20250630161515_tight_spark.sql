/*
  # API Integration System

  1. New Tables
    - `api_integrations` - Store configured integrations and their settings
    - `integration_data_syncs` - Track data sync history and status
    - `webhook_endpoints` - Manage incoming webhooks from integrated platforms

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own integrations
*/

-- API integrations configuration
CREATE TABLE IF NOT EXISTS api_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  platform text NOT NULL, -- 'stripe', 'posthog', 'productboard', etc.
  display_name text NOT NULL,
  api_key_encrypted text, -- Encrypted API keys
  webhook_secret text, -- For webhook verification
  configuration jsonb DEFAULT '{}', -- Platform-specific config
  is_active boolean DEFAULT true,
  last_sync_at timestamptz,
  sync_status text DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'success', 'error')),
  sync_error text,
  data_points_synced integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Data sync history and status
CREATE TABLE IF NOT EXISTS integration_data_syncs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES api_integrations(id) ON DELETE CASCADE NOT NULL,
  sync_type text NOT NULL, -- 'full', 'incremental', 'webhook'
  data_type text NOT NULL, -- 'customers', 'revenue', 'events', 'metrics'
  records_processed integer DEFAULT 0,
  records_success integer DEFAULT 0,
  records_error integer DEFAULT 0,
  sync_status text DEFAULT 'running' CHECK (sync_status IN ('running', 'completed', 'failed')),
  error_details jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Webhook endpoint management
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  integration_id uuid REFERENCES api_integrations(id) ON DELETE CASCADE NOT NULL,
  endpoint_url text NOT NULL,
  webhook_secret text NOT NULL,
  events_subscribed text[] DEFAULT '{}',
  is_verified boolean DEFAULT false,
  last_received_at timestamptz,
  total_events_received integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE api_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_data_syncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_integrations
CREATE POLICY "Users can manage their own integrations"
  ON api_integrations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for integration_data_syncs
CREATE POLICY "Users can view their integration sync history"
  ON integration_data_syncs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM api_integrations ai 
    WHERE ai.id = integration_id 
    AND ai.user_id = auth.uid()
  ));

CREATE POLICY "System can manage integration sync data"
  ON integration_data_syncs FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM api_integrations ai 
    WHERE ai.id = integration_id 
    AND ai.user_id = auth.uid()
  ));

-- RLS Policies for webhook_endpoints
CREATE POLICY "Users can manage their webhook endpoints"
  ON webhook_endpoints FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_api_integrations_user_platform ON api_integrations(user_id, platform);
CREATE INDEX idx_api_integrations_active ON api_integrations(is_active) WHERE is_active = true;
CREATE INDEX idx_integration_data_syncs_integration ON integration_data_syncs(integration_id);
CREATE INDEX idx_integration_data_syncs_created ON integration_data_syncs(started_at);
CREATE INDEX idx_webhook_endpoints_integration ON webhook_endpoints(integration_id);