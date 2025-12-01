import { useState } from 'react';
import { ANIMATION_DELAYS } from '../constants';

type OnboardingStep =
  | 'auth'
  | 'location'
  | 'calendar'
  | 'personal'
  | 'sport'
  | 'tennis-rating'
  | 'pickleball-rating'
  | 'preferences'
  | 'availabilities'
  | null;

/**
 * Custom hook for managing the onboarding flow overlays
 * Handles visibility state for all onboarding overlays with conditional rating flow
 */
export const useOnboardingFlow = () => {
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [showLocationPermission, setShowLocationPermission] = useState(false);
  const [showCalendarAccess, setShowCalendarAccess] = useState(false);
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showSportSelection, setShowSportSelection] = useState(false);
  const [showTennisRating, setShowTennisRating] = useState(false);
  const [showPickleballRating, setShowPickleballRating] = useState(false);
  const [showPlayerPreferences, setShowPlayerPreferences] = useState(false);
  const [showPlayerAvailabilities, setShowPlayerAvailabilities] = useState(false);
  const [showAuthSuccess, setShowAuthSuccess] = useState(false);

  // Track which sports were selected (names for flow control)
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  
  // Track sport IDs for database operations
  const [selectedSportIds, setSelectedSportIds] = useState<string[]>([]);

  // Track the last active overlay for resume functionality
  const [lastActiveOverlay, setLastActiveOverlay] = useState<OnboardingStep>(null);

  /**
   * Calculate current step based on visible overlays
   * Note: Location and Calendar permissions are excluded from progress tracking
   * Steps: 1=Auth, 2=Personal, 3=Sport, 4=Tennis, 5=Pickleball, 6=Preferences, 7=Availabilities
   */
  const getCurrentStep = (): number => {
    // Location and Calendar permission overlays don't count as steps
    if (showLocationPermission) return 0;
    if (showCalendarAccess) return 0;
    if (showAuthOverlay) return 1;
    if (showPersonalInfo) return 2;
    if (showSportSelection) return 3;
    if (showTennisRating) return 4;
    if (showPickleballRating) return 5;
    if (showPlayerPreferences) return 6;
    if (showPlayerAvailabilities) return 7;
    return 1;
  };

  /**
   * Calculate total steps based on selected sports
   * Note: Location and Calendar permissions are excluded from progress tracking
   * Base: 5 steps (Auth, Personal, Sport, Preferences, Availabilities)
   * 
   * Breakdown:
   * - Auth: 1 step
   * - Personal: 1 step
   * - Sport Selection: 1 step
   * - Tennis Rating: +1 if selected
   * - Pickleball Rating: +1 if selected
   * - Preferences: 1 step
   * - Availabilities: 1 step
   */
  const getTotalSteps = (): number => {
    let total = 5; // Auth, Personal, Sport, Preferences, Availabilities
    if (selectedSports.includes('tennis')) total++;
    if (selectedSports.includes('pickleball')) total++;
    return total;
  };

  const currentStep = getCurrentStep();
  const totalSteps = getTotalSteps();

  /**
   * Start or resume onboarding flow
   * If user previously closed an overlay, resume from that point
   * Otherwise, start from the beginning
   */
  const startOnboarding = () => {
    if (lastActiveOverlay) {
      // Resume from last active overlay
      console.log('Resuming onboarding from:', lastActiveOverlay);
      switch (lastActiveOverlay) {
        case 'personal':
          setShowPersonalInfo(true);
          break;
        case 'sport':
          setShowSportSelection(true);
          break;
        case 'tennis-rating':
          setShowTennisRating(true);
          break;
        case 'pickleball-rating':
          setShowPickleballRating(true);
          break;
        case 'preferences':
          setShowPlayerPreferences(true);
          break;
        case 'availabilities':
          setShowPlayerAvailabilities(true);
          break;
        default:
          setShowAuthOverlay(true);
      }
    } else {
      // Start from beginning
      setShowAuthOverlay(true);
    }
  };

  /**
   * Close overlay without going back (simply dismiss)
   * Preserves progress for resume functionality
   */
  const closeAuthOverlay = () => {
    setShowAuthOverlay(false);
    setLastActiveOverlay('auth');
  };

  const handleAuthSuccess = () => {
    console.log('Auth success - closing AuthOverlay');
    // Close auth overlay
    setShowAuthOverlay(false);

    // Show Personal Information overlay after auth completes
    setTimeout(() => {
      console.log('Opening PersonalInformationOverlay');
      setShowPersonalInfo(true);
    }, ANIMATION_DELAYS.OVERLAY_TRANSITION);
  };

  const handleAcceptLocation = () => {
    console.log('Location permission accepted');
    setShowLocationPermission(false);

    // Show Calendar overlay after location permission
    setTimeout(() => {
      console.log('Opening CalendarAccessOverlay');
      setShowCalendarAccess(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
    // TODO: Request actual location permission
  };

  const handleRefuseLocation = () => {
    console.log('Location permission refused');
    setShowLocationPermission(false);

    // Show Calendar overlay even if location was refused
    setTimeout(() => {
      console.log('Opening CalendarAccessOverlay');
      setShowCalendarAccess(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  const showCalendarOverlay = () => {
    console.log('Showing calendar access overlay');
    setShowCalendarAccess(true);
  };

  const handleAcceptCalendar = () => {
    console.log('Calendar permission accepted');
    setShowCalendarAccess(false);
    // TODO: Request actual calendar permission
  };

  const handleRefuseCalendar = () => {
    console.log('Calendar permission refused');
    setShowCalendarAccess(false);
  };

  const handlePersonalInfoContinue = () => {
    console.log('Personal info completed');
    setShowPersonalInfo(false);

    // Show Sport Selection overlay after personal info
    setTimeout(() => {
      console.log('Opening SportSelectionOverlay');
      setShowSportSelection(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Close overlay without going back (simply dismiss)
   * Preserves progress for resume functionality
   */
  const closePersonalInfo = () => {
    setShowPersonalInfo(false);
    setLastActiveOverlay('personal');
  };

  /**
   * Back button handler - navigate to previous overlay (Auth)
   */
  const backFromPersonalInfo = () => {
    console.log('Going back from PersonalInformationOverlay to Auth');
    setShowPersonalInfo(false);
    setTimeout(() => {
      setShowAuthOverlay(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Back button handler - navigate to previous overlay (Personal)
   */
  const backFromSportSelection = () => {
    console.log('Going back from SportSelectionOverlay to PersonalInfo');
    setShowSportSelection(false);
    setTimeout(() => {
      setShowPersonalInfo(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Back button handler - navigate to previous overlay (Sport Selection)
   */
  const backFromTennisRating = () => {
    console.log('Going back from TennisRatingOverlay to SportSelection');
    setShowTennisRating(false);
    setTimeout(() => {
      setShowSportSelection(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Back button handler - navigate to previous overlay (Tennis or Sport)
   */
  const backFromPickleballRating = () => {
    console.log('Going back from PickleballRatingOverlay');
    setShowPickleballRating(false);
    setTimeout(() => {
      if (selectedSports.includes('tennis')) {
        setShowTennisRating(true);
      } else {
        setShowSportSelection(true);
      }
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Back button handler - navigate to previous overlay (last rating overlay)
   */
  const backFromPlayerPreferences = () => {
    console.log('Going back from PlayerPreferencesOverlay');
    setShowPlayerPreferences(false);
    setTimeout(() => {
      if (selectedSports.includes('pickleball')) {
        setShowPickleballRating(true);
      } else if (selectedSports.includes('tennis')) {
        setShowTennisRating(true);
      } else {
        setShowSportSelection(true);
      }
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Back button handler - navigate to previous overlay (Preferences)
   */
  const backFromPlayerAvailabilities = () => {
    console.log('Going back from PlayerAvailabilitiesOverlay to Preferences');
    setShowPlayerAvailabilities(false);
    setTimeout(() => {
      setShowPlayerPreferences(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  const handleSportSelectionContinue = (sports: string[], sportIds?: string[]) => {
    console.log('Sport selection completed:', sports);
    setSelectedSports(sports);
    if (sportIds) {
      setSelectedSportIds(sportIds);
      console.log('Sport IDs for availability:', sportIds);
    }
    setShowSportSelection(false);

    // Determine which rating overlay to show based on selected sports
    setTimeout(() => {
      const hasTennis = sports.includes('tennis');
      const hasPickleball = sports.includes('pickleball');

      if (hasTennis) {
        // If tennis selected (with or without pickleball), show tennis rating first
        console.log('Opening TennisRatingOverlay');
        setShowTennisRating(true);
      } else if (hasPickleball) {
        // If only pickleball selected, show pickleball rating
        console.log('Opening PickleballRatingOverlay');
        setShowPickleballRating(true);
      } else {
        // No sports selected (shouldn't happen, but fallback to preferences)
        console.log('No sports selected, opening PlayerPreferencesOverlay');
        setShowPlayerPreferences(true);
      }
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Close overlay without going back (simply dismiss)
   * Preserves progress for resume functionality
   */
  const closeSportSelection = () => {
    console.log('Closing SportSelectionOverlay');
    setShowSportSelection(false);
    setLastActiveOverlay('sport');
  };

  const handleTennisRatingContinue = (rating: string) => {
    console.log('Tennis rating completed:', rating);
    setShowTennisRating(false);

    // Check if pickleball was also selected
    setTimeout(() => {
      if (selectedSports.includes('pickleball')) {
        // Show pickleball rating next
        console.log('Opening PickleballRatingOverlay');
        setShowPickleballRating(true);
      } else {
        // Go straight to preferences
        console.log('Opening PlayerPreferencesOverlay');
        setShowPlayerPreferences(true);
      }
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Close overlay without going back (simply dismiss)
   * Preserves progress for resume functionality
   */
  const closeTennisRating = () => {
    console.log('Closing TennisRatingOverlay');
    setShowTennisRating(false);
    setLastActiveOverlay('tennis-rating');
  };

  const handlePickleballRatingContinue = (rating: string) => {
    console.log('Pickleball rating completed:', rating);
    setShowPickleballRating(false);

    // Always go to preferences after pickleball rating
    setTimeout(() => {
      console.log('Opening PlayerPreferencesOverlay');
      setShowPlayerPreferences(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Close overlay without going back (simply dismiss)
   * Preserves progress for resume functionality
   */
  const closePickleballRating = () => {
    console.log('Closing PickleballRatingOverlay');
    setShowPickleballRating(false);
    setLastActiveOverlay('pickleball-rating');
  };

  const handlePlayerPreferencesContinue = (preferences: unknown) => {
    console.log('Player preferences completed:', preferences);
    setShowPlayerPreferences(false);

    // Show Player Availabilities overlay after preferences
    setTimeout(() => {
      console.log('Opening PlayerAvailabilitiesOverlay');
      setShowPlayerAvailabilities(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Close overlay without going back (simply dismiss)
   * Preserves progress for resume functionality
   */
  const closePlayerPreferences = () => {
    console.log('Closing PlayerPreferencesOverlay');
    setShowPlayerPreferences(false);
    setLastActiveOverlay('preferences');
  };

  const handlePlayerAvailabilitiesContinue = (availabilities: unknown) => {
    console.log('Player availabilities completed:', availabilities);
    setShowPlayerAvailabilities(false);
    // TODO: In the future, persist data first, then show success overlay only if successful
    // For now, always show the success overlay
    setTimeout(() => {
      setShowAuthSuccess(true);
      // Clear last active overlay since onboarding is complete
      setLastActiveOverlay(null);
      console.log('Onboarding flow completed!');
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Close overlay without going back (simply dismiss)
   * Preserves progress for resume functionality
   */
  const closePlayerAvailabilities = () => {
    console.log('Closing PlayerAvailabilitiesOverlay');
    setShowPlayerAvailabilities(false);
    setLastActiveOverlay('availabilities');
  };

  const showLocationPermissionOnMount = () => {
    console.log('Showing LocationPermissionOverlay on mount');
    setShowLocationPermission(true);
  };

  /**
   * Close the AuthSuccessOverlay
   */
  const closeAuthSuccess = () => {
    console.log('Closing AuthSuccessOverlay');
    setShowAuthSuccess(false);
  };

  return {
    // State
    showAuthOverlay,
    showLocationPermission,
    showCalendarAccess,
    showPersonalInfo,
    showSportSelection,
    showTennisRating,
    showPickleballRating,
    showPlayerPreferences,
    showPlayerAvailabilities,
    showAuthSuccess,
    selectedSports,
    selectedSportIds,
    currentStep,
    totalSteps,

    // Actions
    startOnboarding,
    closeAuthOverlay,
    handleAuthSuccess,
    handleAcceptLocation,
    handleRefuseLocation,
    showCalendarOverlay,
    handleAcceptCalendar,
    handleRefuseCalendar,
    handlePersonalInfoContinue,
    closePersonalInfo,
    backFromPersonalInfo,
    handleSportSelectionContinue,
    closeSportSelection,
    backFromSportSelection,
    handleTennisRatingContinue,
    closeTennisRating,
    backFromTennisRating,
    handlePickleballRatingContinue,
    closePickleballRating,
    backFromPickleballRating,
    handlePlayerPreferencesContinue,
    closePlayerPreferences,
    backFromPlayerPreferences,
    handlePlayerAvailabilitiesContinue,
    closePlayerAvailabilities,
    backFromPlayerAvailabilities,
    closeAuthSuccess,
    showLocationPermissionOnMount,
  };
};
