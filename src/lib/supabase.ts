import { createClient } from '@supabase/supabase-js';

// Primary: Use cloud Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create single client with primary (cloud) configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to detect if we're using local or cloud
export const isUsingLocalSupabase = () => {
  return supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');
};

// Log which environment we're using
console.log(`🚀 Using ${isUsingLocalSupabase() ? 'Local' : 'Cloud'} Supabase:`, supabaseUrl);