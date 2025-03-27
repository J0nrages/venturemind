/*
  # Create Proforma Tables

  1. New Tables
    - `proforma_scenarios`: Stores different financial scenarios
    - `proforma_financials`: Stores financial metrics for each scenario

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Drop existing policies if they exist
DO $$ BEGIN
  -- Proforma scenarios policies
  DROP POLICY IF EXISTS "Users can view their own scenarios" ON proforma_scenarios;
  DROP POLICY IF EXISTS "Users can create their own scenarios" ON proforma_scenarios;
  DROP POLICY IF EXISTS "Users can update their own scenarios" ON proforma_scenarios;
  DROP POLICY IF EXISTS "Users can delete their own scenarios" ON proforma_scenarios;
  
  -- Proforma financials policies
  DROP POLICY IF EXISTS "Users can view their scenarios' financials" ON proforma_financials;
  DROP POLICY IF EXISTS "Users can create financials for their scenarios" ON proforma_financials;
  DROP POLICY IF EXISTS "Users can update financials for their scenarios" ON proforma_financials;
  DROP POLICY IF EXISTS "Users can delete financials for their scenarios" ON proforma_financials;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- Create proforma_scenarios table
CREATE TABLE IF NOT EXISTS proforma_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  description text,
  assumptions jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create proforma_financials table
CREATE TABLE IF NOT EXISTS proforma_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid REFERENCES proforma_scenarios ON DELETE CASCADE NOT NULL,
  revenue numeric NOT NULL DEFAULT 0,
  profit numeric NOT NULL DEFAULT 0,
  expenses numeric NOT NULL DEFAULT 0,
  revenue_change numeric NOT NULL DEFAULT 0,
  profit_change numeric NOT NULL DEFAULT 0,
  expenses_change numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE proforma_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_financials ENABLE ROW LEVEL SECURITY;

-- Scenarios policies
CREATE POLICY "Users can view their own scenarios"
  ON proforma_scenarios
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scenarios"
  ON proforma_scenarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenarios"
  ON proforma_scenarios
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenarios"
  ON proforma_scenarios
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Financials policies
CREATE POLICY "Users can view their scenarios' financials"
  ON proforma_financials
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM proforma_scenarios
    WHERE proforma_scenarios.id = scenario_id
    AND proforma_scenarios.user_id = auth.uid()
  ));

CREATE POLICY "Users can create financials for their scenarios"
  ON proforma_financials
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM proforma_scenarios
    WHERE proforma_scenarios.id = scenario_id
    AND proforma_scenarios.user_id = auth.uid()
  ));

CREATE POLICY "Users can update financials for their scenarios"
  ON proforma_financials
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM proforma_scenarios
    WHERE proforma_scenarios.id = scenario_id
    AND proforma_scenarios.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM proforma_scenarios
    WHERE proforma_scenarios.id = scenario_id
    AND proforma_scenarios.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete financials for their scenarios"
  ON proforma_financials
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM proforma_scenarios
    WHERE proforma_scenarios.id = scenario_id
    AND proforma_scenarios.user_id = auth.uid()
  ));

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_proforma_scenarios_user;
DROP INDEX IF EXISTS idx_proforma_financials_scenario;

-- Create indexes
CREATE INDEX idx_proforma_scenarios_user ON proforma_scenarios(user_id);
CREATE INDEX idx_proforma_financials_scenario ON proforma_financials(scenario_id);