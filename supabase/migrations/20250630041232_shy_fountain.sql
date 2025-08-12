/*
  # Enhanced Business Flexibility Schema

  1. New Tables for Business Dimensions
    - `business_dimensions` - Track different business aspects (segments, products, markets)
    - `dimension_values` - Values for each dimension (Enterprise, SMB, Product A, US Market, etc.)
    - `custom_document_types` - User-defined document templates
    - `document_relationships` - Link related documents
    - `business_metrics` - Custom KPI tracking
    - `metric_data_points` - Time-series metric values

  2. Enhanced Flexibility Features
    - Multi-dimensional business tracking
    - Custom document type creation
    - Document hierarchy and relationships
    - Industry-specific templates
    - Advanced analytics support
*/

-- Business dimensions for flexible categorization
CREATE TABLE IF NOT EXISTS business_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  description text,
  dimension_type text NOT NULL CHECK (dimension_type IN ('customer_segment', 'product_line', 'revenue_stream', 'geographic', 'temporal', 'custom')),
  is_system_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Values for each business dimension
CREATE TABLE IF NOT EXISTS dimension_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id uuid REFERENCES business_dimensions(id) ON DELETE CASCADE NOT NULL,
  value text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- User-defined custom document types
CREATE TABLE IF NOT EXISTS custom_document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  description text,
  template_structure jsonb NOT NULL DEFAULT '{}',
  default_content text,
  keywords text[] DEFAULT '{}',
  icon text DEFAULT 'FileText',
  category text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document relationships and hierarchies
CREATE TABLE IF NOT EXISTS document_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_document_id uuid REFERENCES user_documents(id) ON DELETE CASCADE NOT NULL,
  child_document_id uuid REFERENCES user_documents(id) ON DELETE CASCADE NOT NULL,
  relationship_type text NOT NULL CHECK (relationship_type IN ('parent_child', 'dependency', 'reference', 'template_instance')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_document_id, child_document_id, relationship_type)
);

-- Custom business metrics tracking
CREATE TABLE IF NOT EXISTS business_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  description text,
  metric_type text NOT NULL CHECK (metric_type IN ('revenue', 'customer', 'operational', 'financial', 'growth', 'custom')),
  unit text, -- 'dollars', 'percentage', 'count', etc.
  calculation_method text, -- 'sum', 'average', 'latest', 'formula'
  target_value numeric,
  dimensions uuid[] DEFAULT '{}', -- References to business_dimensions
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Time-series data for custom metrics
CREATE TABLE IF NOT EXISTS metric_data_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id uuid REFERENCES business_metrics(id) ON DELETE CASCADE NOT NULL,
  value numeric NOT NULL,
  dimension_breakdown jsonb DEFAULT '{}', -- breakdown by dimensions
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Document-dimension associations
CREATE TABLE IF NOT EXISTS document_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES user_documents(id) ON DELETE CASCADE NOT NULL,
  dimension_id uuid REFERENCES business_dimensions(id) ON DELETE CASCADE NOT NULL,
  dimension_value_id uuid REFERENCES dimension_values(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(document_id, dimension_id)
);

-- Enable RLS on all new tables
ALTER TABLE business_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dimension_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_data_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_dimensions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_dimensions
CREATE POLICY "Users can manage their own business dimensions"
  ON business_dimensions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR is_system_default = true)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for dimension_values
CREATE POLICY "Users can manage dimension values for their dimensions"
  ON dimension_values FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM business_dimensions bd 
    WHERE bd.id = dimension_id 
    AND (bd.user_id = auth.uid() OR bd.is_system_default = true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM business_dimensions bd 
    WHERE bd.id = dimension_id 
    AND bd.user_id = auth.uid()
  ));

-- RLS Policies for custom_document_types
CREATE POLICY "Users can manage their own custom document types"
  ON custom_document_types FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for document_relationships
CREATE POLICY "Users can manage relationships for their documents"
  ON document_relationships FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_documents ud 
    WHERE (ud.id = parent_document_id OR ud.id = child_document_id)
    AND ud.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_documents ud1, user_documents ud2
    WHERE ud1.id = parent_document_id 
    AND ud2.id = child_document_id
    AND ud1.user_id = auth.uid() 
    AND ud2.user_id = auth.uid()
  ));

-- RLS Policies for business_metrics
CREATE POLICY "Users can manage their own business metrics"
  ON business_metrics FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for metric_data_points
CREATE POLICY "Users can manage data points for their metrics"
  ON metric_data_points FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM business_metrics bm 
    WHERE bm.id = metric_id 
    AND bm.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM business_metrics bm 
    WHERE bm.id = metric_id 
    AND bm.user_id = auth.uid()
  ));

-- RLS Policies for document_dimensions
CREATE POLICY "Users can manage dimensions for their documents"
  ON document_dimensions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_documents ud 
    WHERE ud.id = document_id 
    AND ud.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_documents ud 
    WHERE ud.id = document_id 
    AND ud.user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX idx_business_dimensions_user_type ON business_dimensions(user_id, dimension_type);
CREATE INDEX idx_dimension_values_dimension ON dimension_values(dimension_id);
CREATE INDEX idx_custom_document_types_user_category ON custom_document_types(user_id, category);
CREATE INDEX idx_document_relationships_parent ON document_relationships(parent_document_id);
CREATE INDEX idx_document_relationships_child ON document_relationships(child_document_id);
CREATE INDEX idx_business_metrics_user_type ON business_metrics(user_id, metric_type);
CREATE INDEX idx_metric_data_points_metric_period ON metric_data_points(metric_id, period_start, period_end);
CREATE INDEX idx_document_dimensions_document ON document_dimensions(document_id);

-- Insert default business dimensions that work for most SaaS businesses
INSERT INTO business_dimensions (user_id, name, description, dimension_type, is_system_default) 
SELECT 
  auth.uid(),
  'Customer Segments',
  'Different types of customers (Enterprise, SMB, Consumer)',
  'customer_segment',
  true
WHERE auth.uid() IS NOT NULL;

INSERT INTO business_dimensions (user_id, name, description, dimension_type, is_system_default) 
SELECT 
  auth.uid(),
  'Product Lines',
  'Different products or services offered',
  'product_line',
  true
WHERE auth.uid() IS NOT NULL;

INSERT INTO business_dimensions (user_id, name, description, dimension_type, is_system_default) 
SELECT 
  auth.uid(),
  'Revenue Streams',
  'Different ways the business generates revenue',
  'revenue_stream',
  true
WHERE auth.uid() IS NOT NULL;

INSERT INTO business_dimensions (user_id, name, description, dimension_type, is_system_default) 
SELECT 
  auth.uid(),
  'Geographic Markets',
  'Different geographic regions or markets',
  'geographic',
  true
WHERE auth.uid() IS NOT NULL;

-- Add more industry-specific document templates
INSERT INTO document_templates (name, category, template_content, keywords, icon, description) VALUES
(
  'API Documentation',
  'technical',
  E'# API Documentation\n\n## Authentication\n[Authentication methods and requirements]\n\n## Endpoints\n[API endpoints and methods]\n\n## Request/Response Examples\n[Sample requests and responses]\n\n## Rate Limiting\n[Rate limiting policies]\n\n## Error Codes\n[Error handling and status codes]',
  ARRAY['api', 'endpoint', 'authentication', 'documentation', 'integration', 'webhook'],
  'Code',
  'API documentation for developers and integrations'
),
(
  'Customer Success Playbook',
  'operations',
  E'# Customer Success Playbook\n\n## Onboarding Process\n[Customer onboarding workflow]\n\n## Success Metrics\n[Customer health scores and KPIs]\n\n## Escalation Procedures\n[Issue escalation and resolution]\n\n## Renewal Strategy\n[Customer retention and renewal tactics]\n\n## Expansion Opportunities\n[Upselling and cross-selling strategies]',
  ARRAY['customer success', 'onboarding', 'retention', 'health score', 'renewal', 'expansion'],
  'Users',
  'Customer success management and retention strategies'
),
(
  'Compliance Documentation',
  'legal',
  E'# Compliance Documentation\n\n## Regulatory Requirements\n[Applicable regulations and standards]\n\n## Security Policies\n[Security protocols and procedures]\n\n## Data Privacy\n[Data handling and privacy policies]\n\n## Audit Procedures\n[Internal and external audit processes]\n\n## Compliance Monitoring\n[Ongoing compliance tracking and reporting]',
  ARRAY['compliance', 'security', 'privacy', 'audit', 'regulation', 'policy'],
  'Settings',
  'Compliance and regulatory documentation'
),
(
  'Competitive Analysis',
  'strategy',
  E'# Competitive Analysis\n\n## Competitor Landscape\n[Key competitors and market positioning]\n\n## Feature Comparison\n[Product feature analysis]\n\n## Pricing Analysis\n[Competitive pricing strategies]\n\n## Market Opportunities\n[Gaps and opportunities in the market]\n\n## Competitive Response\n[Strategic responses to competitive threats]',
  ARRAY['competition', 'analysis', 'market', 'positioning', 'pricing', 'strategy'],
  'BarChart3',
  'Competitive landscape and market analysis'
);