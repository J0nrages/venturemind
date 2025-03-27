/*
  # Add customer events policies

  1. Changes
    - Enable RLS on customer_events table
    - Add INSERT policy for customer events
    - Add SELECT policy for customer events

  2. Security
    - Ensures users can only create and view their own events
    - Maintains data isolation between users
*/

-- Enable RLS on customer_events table if not already enabled
ALTER TABLE customer_events ENABLE ROW LEVEL SECURITY;

-- Add INSERT policy for customer events if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_events' AND policyname = 'Users can insert their own events'
  ) THEN
    CREATE POLICY "Users can insert their own events"
      ON customer_events FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add SELECT policy for customer events if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_events' AND policyname = 'Users can view their own events'
  ) THEN
    CREATE POLICY "Users can view their own events"
      ON customer_events FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;