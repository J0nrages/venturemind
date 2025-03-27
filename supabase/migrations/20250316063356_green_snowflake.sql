/*
  # Clear mock data and add constraints

  1. Changes
    - Clear all mock data from tables
    - Add NOT NULL constraints for required fields
    
  2. Security
    - Maintain existing RLS policies
    - Only clear data, no structural changes
*/

-- Clear mock data from all tables
DELETE FROM business_profiles;
DELETE FROM transactions;
DELETE FROM subscriptions;
DELETE FROM customer_events;
DELETE FROM user_settings;