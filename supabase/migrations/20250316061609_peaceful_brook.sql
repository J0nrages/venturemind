/*
  # Create business profile schema

  1. New Tables
    - `business_profiles` - Store business configuration and settings
      - Basic company information
      - Revenue model settings
      - Customer segment preferences
      
  2. Security
    - Enable RLS
    - Add policies for data access
*/

CREATE TABLE business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  company_name text NOT NULL,
  industry text NOT NULL,
  size text NOT NULL,
  revenue_model text NOT NULL,
  billing_cycle text NOT NULL,
  start_date date NOT NULL,
  marketing_budget numeric,
  customer_segments text[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own business profile
CREATE POLICY "Users can view their own business profile"
  ON business_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to update their own business profile
CREATE POLICY "Users can update their own business profile"
  ON business_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own business profile
CREATE POLICY "Users can insert their own business profile"
  ON business_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create unique constraint to ensure one profile per user
ALTER TABLE business_profiles
  ADD CONSTRAINT business_profiles_user_id_key UNIQUE (user_id);

-- Create index for faster lookups
CREATE INDEX idx_business_profiles_user ON business_profiles(user_id);