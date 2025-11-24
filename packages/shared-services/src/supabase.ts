import { createClient } from '@supabase/supabase-js';

// Supabase credentials from environment variables
// These will be injected by the platform (React Native or Next.js)
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Platform-specific storage will be configured by the consuming app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Platform-specific configuration helper
export const configureSupabaseStorage = (storage: any) => {
  // This will be called by mobile and web apps to set platform-specific storage
  // Mobile: AsyncStorage
  // Web: localStorage (default in browser)
  if (storage) {
    supabase.auth.setStorage(storage);
  }
};
