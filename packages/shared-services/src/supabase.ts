import { createClient } from '@supabase/supabase-js';

// Supabase credentials from environment variables
// These will be injected by the platform (React Native or Next.js)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Platform-specific storage will be configured by the consuming app
export let supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Platform-specific configuration helper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const configureSupabaseStorage = (storage: any) => {
  // Recreate the client with the platform-specific storage
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storage: storage, // Set storage during client creation
    },
  });
  
  return supabase;
};
