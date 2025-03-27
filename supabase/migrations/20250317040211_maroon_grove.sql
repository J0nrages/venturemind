/*
  # Create proforma financial modeling tables

  1. New Tables
    - `proforma_scenarios` - Store different financial scenarios and their assumptions
      - Includes scenario metadata and assumption parameters
    - `proforma_financials` - Store generated financial statements for each scenario
      - Contains computed financial projections based on assumptions

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Scenarios table for storing financial modeling assumptions
CREATE TABLE IF NOT EXISTS proforma_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  description text,
  assumptions jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Generated financial statements based on scenarios
CREATE TABLE IF NOT EXISTS proforma_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid REFERENCES proforma_scenarios(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  income_statement jsonb DEFAULT '{}',
  balance_sheet jsonb DEFAULT '{}',
  cash_flow jsonb DEFAULT '{}',
  metrics jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE proforma_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_financials ENABLE ROW LEVEL SECURITY;

-- Scenario access policies
CREATE POLICY "Users can view their own scenarios"
  ON proforma_scenarios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scenarios"
  ON proforma_scenarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenarios"
  ON proforma_scenarios FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenarios"
  ON proforma_scenarios FOR DELETE
  USING (auth.uid() = user_id);

-- Financial data access policies
CREATE POLICY "Users can view their own financial data"
  ON proforma_financials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial data"
  ON proforma_financials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial data"
  ON proforma_financials FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial data"
  ON proforma_financials FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_proforma_scenarios_user ON proforma_scenarios(user_id);
CREATE INDEX idx_proforma_financials_scenario ON proforma_financials(scenario_id);
CREATE INDEX idx_proforma_financials_user ON proforma_financials(user_id);