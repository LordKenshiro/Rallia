/**
 * Mobile-specific Supabase configuration
 * Configures Supabase with AsyncStorage for React Native
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, configureSupabaseStorage } from '@rallia/shared-services';

// Configure Supabase with AsyncStorage for mobile
configureSupabaseStorage(AsyncStorage);

export { supabase };
