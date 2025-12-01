import { useState, useEffect } from 'react';
import { supabase } from '@rallia/shared-services';
import type { Session } from '@supabase/supabase-js';

/**
 * Custom hook for managing authentication state
 * Handles session management and auth state changes
 */
export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session and validate it
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Validate session by checking if user still exists in database
          const { data: { user }, error } = await supabase.auth.getUser();
          
          if (error || !user) {
            // Session exists but user was deleted - clear the invalid session
            console.warn('⚠️ Invalid session detected (user deleted from database). Clearing session...');
            await supabase.auth.signOut();
            setSession(null);
          } else {
            // Valid session
            setSession(session);
          }
        } else {
          setSession(null);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        // Clear session on error
        await supabase.auth.signOut();
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    initializeSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    session,
    loading,
    signOut,
    isAuthenticated: !!session,
  };
};
