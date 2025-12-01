import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@rallia/shared-services';

/**
 * Sport interface matching database schema
 */
export interface Sport {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Custom hook for fetching all active sports
 * Eliminates duplicate sports fetching code across components
 * 
 * @returns Object containing sports array, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { sports, loading, error, refetch } = useSports();
 * 
 * if (loading) return <Spinner />;
 * if (error) return <ErrorMessage message={error.message} />;
 * 
 * return sports.map(sport => <SportCard key={sport.id} sport={sport} />);
 * ```
 */
export const useSports = () => {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all active sports from database
      const { data, error: sportsError } = await supabase
        .from('sport')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (sportsError) {
        throw new Error(sportsError.message);
      }

      setSports(data || []);
    } catch (err) {
      console.error('Error fetching sports:', err);
      setError(err as Error);
      setSports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSports();
  }, [fetchSports]);

  return { 
    sports, 
    loading, 
    error, 
    refetch: fetchSports 
  };
};
