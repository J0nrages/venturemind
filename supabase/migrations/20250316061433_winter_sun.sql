/*
  # Create optimized metrics schema

  1. New Tables
    - `transactions` - Raw financial transactions
      - Records individual revenue events
      - Basis for MRR/ARR calculations
      
    - `subscriptions` - Customer subscription data
      - Tracks subscription lifecycle
      - Used for churn analysis
      
    - `customer_events` - Customer interaction data
      - Tracks key customer events
      - Used for engagement analysis

  2. Security
    - Enable RLS on all tables
    - Add policies for data access
*/

-- Transactions table for raw financial data
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('subscription', 'one_time', 'refund')),
  status text NOT NULL DEFAULT 'completed',
  subscription_id uuid,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Subscriptions table for recurring revenue tracking
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  plan_id text NOT NULL,
  amount numeric NOT NULL,
  interval text NOT NULL CHECK (interval IN ('monthly', 'annual')),
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Customer events table for engagement tracking
CREATE TABLE customer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events"
  ON customer_events FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at);
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_customer_events_user_type ON customer_events(user_id, event_type);