/**
 * Hook for fetching play styles and play attributes from the database
 * These are sport-specific and stored in the play_style and play_attribute tables
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@rallia/shared-services';

export interface PlayStyleOption {
  id: string;
  name: string;
  description: string | null;
  sportId: string;
}

export interface PlayAttributeOption {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  sportId: string;
}

export interface PlayAttributesByCategory {
  [category: string]: PlayAttributeOption[];
}

interface UsePlayPreferencesResult {
  playStyles: PlayStyleOption[];
  playAttributes: PlayAttributeOption[];
  playAttributesByCategory: PlayAttributesByCategory;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches play styles and attributes for a specific sport
 * @param sportId - The UUID of the sport to fetch preferences for
 */
export function usePlayPreferences(sportId: string | null): UsePlayPreferencesResult {
  const [playStyles, setPlayStyles] = useState<PlayStyleOption[]>([]);
  const [playAttributes, setPlayAttributes] = useState<PlayAttributeOption[]>([]);
  const [playAttributesByCategory, setPlayAttributesByCategory] =
    useState<PlayAttributesByCategory>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!sportId) {
      setPlayStyles([]);
      setPlayAttributes([]);
      setPlayAttributesByCategory({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch play styles and attributes in parallel
      const [stylesResult, attributesResult] = await Promise.all([
        supabase
          .from('play_style')
          .select('id, name, description, sport_id')
          .eq('sport_id', sportId)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('play_attribute')
          .select('id, name, description, category, sport_id')
          .eq('sport_id', sportId)
          .eq('is_active', true)
          .order('category')
          .order('name'),
      ]);

      if (stylesResult.error) throw stylesResult.error;
      if (attributesResult.error) throw attributesResult.error;

      // Map play styles
      const mappedStyles: PlayStyleOption[] = (stylesResult.data || []).map(style => ({
        id: style.id,
        name: style.name,
        description: style.description,
        sportId: style.sport_id,
      }));

      // Map play attributes
      const mappedAttributes: PlayAttributeOption[] = (attributesResult.data || []).map(attr => ({
        id: attr.id,
        name: attr.name,
        description: attr.description,
        category: attr.category,
        sportId: attr.sport_id,
      }));

      // Group attributes by category
      const byCategory: PlayAttributesByCategory = {};
      for (const attr of mappedAttributes) {
        const category = attr.category || 'Other';
        if (!byCategory[category]) {
          byCategory[category] = [];
        }
        byCategory[category].push(attr);
      }

      setPlayStyles(mappedStyles);
      setPlayAttributes(mappedAttributes);
      setPlayAttributesByCategory(byCategory);
    } catch (err) {
      console.error('Failed to fetch play preferences:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch play preferences'));
    } finally {
      setLoading(false);
    }
  }, [sportId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    playStyles,
    playAttributes,
    playAttributesByCategory,
    loading,
    error,
    refetch: fetchData,
  };
}
