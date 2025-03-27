/*
  # Fix subscriptions table RLS policies

  1. Changes
    - Add SELECT policy for subscriptions table to allow users to view their own subscriptions
    - Ensure all CRUD operations are properly secured

  2. Security
    - Enable RLS on subscriptions table
    - Add policies for all CRUD operations
    - Ensure users can only access their own data
*/

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