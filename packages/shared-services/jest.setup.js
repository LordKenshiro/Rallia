/**
 * Jest Setup for shared-services package
 */

// Mock environment variables
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';

// Mock fetch for API calls
global.fetch = jest.fn();
