/*
  # Update business profiles table
  
  1. Changes
    - Safely add or update columns using DO blocks
    - Ensure RLS policies exist
    - Add indexes if missing
    
  2. Security
    - Verify RLS is enabled
    - Ensure policies are in place
*/

-- Ensure RLS is enabled
DO $$ 
BEGIN
  ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Safely ensure all required columns exist
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_profiles' AND column_name = 'marketing_budget'
  ) THEN
    ALTER TABLE business_profiles ADD COLUMN marketing_budget numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_profiles' AND column_name = 'customer_segments'
  ) THEN
    ALTER TABLE business_profiles ADD COLUMN customer_segments text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE business_profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Ensure policies exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'business_profiles' AND policyname = 'Users can view their own business profile'
  ) THEN
    CREATE POLICY "Users can view their own business profile"
      ON business_profiles FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'business_profiles' AND policyname = 'Users can update their own business profile'
  ) THEN
    CREATE POLICY "Users can update their own business profile"
      ON business_profiles FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'business_profiles' AND policyname = 'Users can insert their own business profile'
  ) THEN
    CREATE POLICY "Users can insert their own business profile"
      ON business_profiles FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure indexes exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'business_profiles' AND indexname = 'idx_business_profiles_user'
  ) THEN
    CREATE INDEX idx_business_profiles_user ON business_profiles(user_id);
  END IF;
END $$;

-- Ensure constraints exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'business_profiles_user_id_key'
  ) THEN
    ALTER TABLE business_profiles
      ADD CONSTRAINT business_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;