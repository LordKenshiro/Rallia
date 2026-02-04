/**
 * useTourSequence - Manages the sequence of screen-specific tours
 *
 * This hook determines when to trigger screen-specific tours based on:
 * 1. Main navigation tour completion
 * 2. Screen visit patterns (first visit)
 * 3. User preferences
 *
 * Tour sequence:
 * 1. Main Navigation Tour (tabs) - triggered by WelcomeTourModal
 * 2. Home Screen Tour - triggered on first visit after main tour
 * 3. Profile Screen Tour - triggered on first visit
 * 4. Chat Screen Tour - triggered on first visit
 */

import { useCallback, useEffect, useRef } from 'react';
import { useTour } from '../context/TourContext';
import { TourId } from '@rallia/shared-services';
import { Logger } from '@rallia/shared-services';

// Screen tour IDs
export const SCREEN_TOURS: Record<string, TourId> = {
  home: 'home_screen',
  profile: 'profile_screen',
  chat: 'chat_screen',
  match_creation: 'create_match',
};

interface UseTourSequenceOptions {
  /** The screen this hook is being used on */
  screenId: keyof typeof SCREEN_TOURS;
  /** Whether the screen is ready to show the tour (data loaded, etc.) */
  isReady?: boolean;
  /** Delay before starting the tour (ms) */
  delay?: number;
  /** Whether to automatically start the tour */
  autoStart?: boolean;
}

interface UseTourSequenceResult {
  /** Whether this screen's tour should be shown */
  shouldShowTour: boolean;
  /** Start the tour manually */
  startScreenTour: () => void;
  /** Whether this screen's tour has been completed */
  isTourCompleted: boolean;
  /** Skip this screen's tour */
  skipScreenTour: () => void;
}

export const useTourSequence = ({
  screenId,
  isReady = true,
  delay = 500,
  autoStart = false, // DISABLED by default for now to prevent loops
}: UseTourSequenceOptions): UseTourSequenceResult => {
  // TEMPORARILY DISABLED: Return static values to prevent infinite loops
  // TODO: Re-enable after fixing the loop issue properly
  
  const startScreenTour = useCallback(() => {
    Logger.warn('useTourSequence is temporarily disabled', { screenId });
  }, [screenId]);

  const skipScreenTour = useCallback(() => {
    Logger.warn('useTourSequence is temporarily disabled', { screenId });
  }, [screenId]);

  return {
    shouldShowTour: false,
    startScreenTour,
    isTourCompleted: true,
    skipScreenTour,
  };
};

export default useTourSequence;
