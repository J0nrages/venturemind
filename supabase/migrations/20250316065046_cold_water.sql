/*
  # Update subscription policies

  1. Changes
    - Safely enable RLS on subscriptions table
    - Add SELECT policy for subscriptions if it doesn't exist
    - Add INSERT policy for subscriptions if it doesn't exist

  2. Security
    - Ensures RLS is enabled
    - Adds policies for authenticated users to manage their own subscriptions
    - Uses DO blocks to check for existing policies before creating
*/

-- Enable RLS on subscriptions table if not already enabled
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Add SELECT policy for subscriptions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscriptions' AND policyname = 'Users can view their own subscriptions'
  ) THEN
    CREATE POLICY "Users can view their own subscriptions"
      ON subscriptions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add INSERT policy for subscriptions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscriptions' AND policyname = 'Users can create their own subscriptions'
  ) THEN
    CREATE POLICY "Users can create their own subscriptions"
      ON subscriptions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;