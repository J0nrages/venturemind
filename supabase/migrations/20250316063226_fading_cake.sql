/*
  # Update RLS policies for all tables

  1. Changes
    - Add missing RLS policies for all tables
    - Ensure users can perform CRUD operations on their own data
    - Fix policy definitions for better security

  2. Security
    - Enable RLS on all tables that were missing it
    - Add proper policies for authenticated users
    - Ensure users can only access their own data
*/

-- Enable RLS and update policies for business_profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'business_profiles' AND policyname = 'Users can delete their own business profile'
  ) THEN
    CREATE POLICY "Users can delete their own business profile"
      ON business_profiles FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Enable RLS and update policies for transactions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions'
  ) THEN
    ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can insert their own transactions"
      ON transactions FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own transactions"
      ON transactions FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own transactions"
      ON transactions FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Enable RLS and update policies for subscriptions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscriptions'
  ) THEN
    ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can insert their own subscriptions"
      ON subscriptions FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own subscriptions"
      ON subscriptions FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own subscriptions"
      ON subscriptions FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Enable RLS and update policies for customer_events
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customer_events'
  ) THEN
    ALTER TABLE customer_events ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can insert their own events"
      ON customer_events FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own events"
      ON customer_events FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own events"
      ON customer_events FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Enable RLS and update policies for user_settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_settings'
  ) THEN
    ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can insert their own settings"
      ON user_settings FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own settings"
      ON user_settings FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own settings"
      ON user_settings FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;