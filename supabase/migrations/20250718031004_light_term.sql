/*
  # Fix CASCADE delete for all user-related foreign keys

  This migration ensures all tables that reference auth.users have CASCADE delete constraints.
  It drops existing foreign key constraints and recreates them with ON DELETE CASCADE.
  
  1. Security
    - All user data will be automatically deleted when user is removed
    - Prevents orphaned records across all tables
    
  2. Tables Updated
    - All tables with user_id foreign keys get CASCADE delete
    - Handles both direct and indirect relationships
*/

-- Function to safely drop and recreate foreign key constraints with CASCADE
DO $$
DECLARE
    r RECORD;
    constraint_name TEXT;
    table_name TEXT;
    column_name TEXT;
BEGIN
    -- Get all foreign key constraints that reference auth.users
    FOR r IN 
        SELECT 
            tc.table_name,
            tc.constraint_name,
            kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'users'
        AND tc.table_schema = 'public'
        AND tc.table_name != 'users'
    LOOP
        table_name := r.table_name;
        constraint_name := r.constraint_name;
        column_name := r.column_name;
        
        -- Drop the existing constraint
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', table_name, constraint_name);
        
        -- Recreate with CASCADE delete
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE', 
                      table_name, constraint_name, column_name);
        
        RAISE NOTICE 'Updated constraint % on table % for column %', constraint_name, table_name, column_name;
    END LOOP;
    
    RAISE NOTICE 'CASCADE delete setup complete for all user-related tables';
END $$;

-- Additional safety check - manually handle any tables that might reference users differently
DO $$
BEGIN
    -- Check if there are any remaining constraints that block user deletion
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'users'
        AND tc.table_schema = 'public'
        AND tc.table_name != 'users'
    ) THEN
        RAISE NOTICE 'Some foreign key constraints may still exist. Manual review recommended.';
    ELSE
        RAISE NOTICE 'All foreign key constraints successfully updated with CASCADE delete.';
    END IF;
END $$;

-- Specifically handle personal_categories since that was mentioned in the error
ALTER TABLE personal_categories 
DROP CONSTRAINT IF EXISTS personal_categories_user_id_fkey;

ALTER TABLE personal_categories 
ADD CONSTRAINT personal_categories_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Handle all other critical tables explicitly
ALTER TABLE user_settings 
DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;
ALTER TABLE user_settings 
ADD CONSTRAINT user_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE transactions 
ADD CONSTRAINT transactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE customer_events 
DROP CONSTRAINT IF EXISTS customer_events_user_id_fkey;
ALTER TABLE customer_events 
ADD CONSTRAINT customer_events_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_documents 
DROP CONSTRAINT IF EXISTS user_documents_user_id_fkey;
ALTER TABLE user_documents 
ADD CONSTRAINT user_documents_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE document_memories 
DROP CONSTRAINT IF EXISTS document_memories_user_id_fkey;
ALTER TABLE document_memories 
ADD CONSTRAINT document_memories_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE conversation_messages 
DROP CONSTRAINT IF EXISTS conversation_messages_user_id_fkey;
ALTER TABLE conversation_messages 
ADD CONSTRAINT conversation_messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE business_profiles 
DROP CONSTRAINT IF EXISTS business_profiles_user_id_fkey;
ALTER TABLE business_profiles 
ADD CONSTRAINT business_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE proforma_scenarios 
DROP CONSTRAINT IF EXISTS proforma_scenarios_user_id_fkey;
ALTER TABLE proforma_scenarios 
ADD CONSTRAINT proforma_scenarios_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE proforma_financials 
DROP CONSTRAINT IF EXISTS proforma_financials_user_id_fkey;
ALTER TABLE proforma_financials 
ADD CONSTRAINT proforma_financials_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE business_dimensions 
DROP CONSTRAINT IF EXISTS business_dimensions_user_id_fkey;
ALTER TABLE business_dimensions 
ADD CONSTRAINT business_dimensions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE custom_document_types 
DROP CONSTRAINT IF EXISTS custom_document_types_user_id_fkey;
ALTER TABLE custom_document_types 
ADD CONSTRAINT custom_document_types_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE business_metrics 
DROP CONSTRAINT IF EXISTS business_metrics_user_id_fkey;
ALTER TABLE business_metrics 
ADD CONSTRAINT business_metrics_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE strategic_initiatives 
DROP CONSTRAINT IF EXISTS strategic_initiatives_user_id_fkey;
ALTER TABLE strategic_initiatives 
ADD CONSTRAINT strategic_initiatives_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE swot_items 
DROP CONSTRAINT IF EXISTS swot_items_user_id_fkey;
ALTER TABLE swot_items 
ADD CONSTRAINT swot_items_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE api_metrics 
DROP CONSTRAINT IF EXISTS api_metrics_user_id_fkey;
ALTER TABLE api_metrics 
ADD CONSTRAINT api_metrics_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE revenue_events 
DROP CONSTRAINT IF EXISTS revenue_events_user_id_fkey;
ALTER TABLE revenue_events 
ADD CONSTRAINT revenue_events_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE api_integrations 
DROP CONSTRAINT IF EXISTS api_integrations_user_id_fkey;
ALTER TABLE api_integrations 
ADD CONSTRAINT api_integrations_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE webhook_endpoints 
DROP CONSTRAINT IF EXISTS webhook_endpoints_user_id_fkey;
ALTER TABLE webhook_endpoints 
ADD CONSTRAINT webhook_endpoints_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;