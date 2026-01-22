/**
 * useMatchDraft Hook
 * Manages match creation draft persistence using AsyncStorage.
 * Allows users to resume incomplete match creation forms.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MatchFormSchemaData } from '@rallia/shared-types';

const DRAFT_STORAGE_KEY = '@rallia/match-creation-draft';
const DRAFT_EXPIRY_HOURS = 24; // Draft expires after 24 hours

interface MatchDraft {
  /** The form data */
  data: Partial<MatchFormSchemaData>;
  /** Current step (1, 2, or 3) */
  currentStep: number;
  /** When the draft was last saved */
  savedAt: string;
  /** Sport ID the draft was created for */
  sportId: string;
}

interface UseMatchDraftReturn {
  /** Whether there's an existing draft */
  hasDraft: boolean;
  /** The draft data if available */
  draft: MatchDraft | null;
  /** Whether the draft is being loaded */
  isLoading: boolean;
  /** Save draft to storage */
  saveDraft: (
    data: Partial<MatchFormSchemaData>,
    currentStep: number,
    sportId: string
  ) => Promise<void>;
  /** Load draft from storage */
  loadDraft: () => Promise<MatchDraft | null>;
  /** Clear the draft */
  clearDraft: () => Promise<void>;
  /** Check if draft is for the same sport */
  isDraftForSport: (sportId: string) => boolean;
}

/**
 * Check if a draft has expired
 */
function isDraftExpired(savedAt: string): boolean {
  const savedDate = new Date(savedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60);
  return hoursDiff > DRAFT_EXPIRY_HOURS;
}

/**
 * Hook for managing match creation draft persistence
 *
 * @example
 * ```tsx
 * const { hasDraft, draft, saveDraft, loadDraft, clearDraft } = useMatchDraft();
 *
 * // On wizard open, check for draft
 * useEffect(() => {
 *   if (hasDraft && draft) {
 *     // Show "Resume draft?" dialog
 *   }
 * }, [hasDraft]);
 *
 * // Save draft on step change
 * const handleStepChange = (newStep: number) => {
 *   saveDraft(formData, newStep, selectedSport.id);
 * };
 *
 * // Clear draft on successful submit
 * const handleSuccess = () => {
 *   clearDraft();
 * };
 * ```
 */
export function useMatchDraft(): UseMatchDraftReturn {
  const [draft, setDraft] = useState<MatchDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load draft on mount
  useEffect(() => {
    loadDraftFromStorage();
  }, []);

  const loadDraftFromStorage = async (): Promise<MatchDraft | null> => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);

      if (!stored) {
        setDraft(null);
        return null;
      }

      const parsed: MatchDraft = JSON.parse(stored);

      // Check if draft has expired
      if (isDraftExpired(parsed.savedAt)) {
        // Clear expired draft
        await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
        setDraft(null);
        return null;
      }

      setDraft(parsed);
      return parsed;
    } catch (error) {
      console.error('Failed to load match draft:', error);
      setDraft(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const saveDraft = useCallback(
    async (
      data: Partial<MatchFormSchemaData>,
      currentStep: number,
      sportId: string
    ): Promise<void> => {
      try {
        const draftData: MatchDraft = {
          data,
          currentStep,
          savedAt: new Date().toISOString(),
          sportId,
        };

        await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
        setDraft(draftData);
      } catch (error) {
        console.error('Failed to save match draft:', error);
      }
    },
    []
  );

  const loadDraft = useCallback(async (): Promise<MatchDraft | null> => {
    return loadDraftFromStorage();
  }, []);

  const clearDraft = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
      setDraft(null);
    } catch (error) {
      console.error('Failed to clear match draft:', error);
    }
  }, []);

  const isDraftForSport = useCallback(
    (sportId: string): boolean => {
      return draft?.sportId === sportId;
    },
    [draft]
  );

  return {
    hasDraft: draft !== null,
    draft,
    isLoading,
    saveDraft,
    loadDraft,
    clearDraft,
    isDraftForSport,
  };
}

export default useMatchDraft;
