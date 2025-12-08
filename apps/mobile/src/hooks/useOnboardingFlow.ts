import { useState } from 'react';
import { ANIMATION_DELAYS } from '../constants';
import { useTimerCleanup } from './useTimerCleanup';
import { Logger } from '@rallia/shared-services';

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
  // Timer cleanup hook to prevent memory leaks
  const { scheduleTimer } = useTimerCleanup();
  
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup'); // Track auth mode
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
   * Steps are dynamic based on selected sports:
   * - 1=Auth, 2=Personal, 3=Sport
   * - Tennis Rating: +1 if tennis selected
   * - Pickleball Rating: +1 if pickleball selected  
   * - Then Preferences, then Availabilities
   */
  const getCurrentStep = (): number => {
    // Location and Calendar permission overlays don't count as steps
    if (showLocationPermission) return 0;
    if (showCalendarAccess) return 0;
    if (showAuthOverlay) return 1;
    if (showPersonalInfo) return 2;
    if (showSportSelection) return 3;
    
    // Dynamic step calculation after sport selection
    let step = 3;
    
    if (showTennisRating) {
      return step + 1; // Tennis is always step 4 when shown
    }
    if (selectedSports.includes('tennis')) step++; // Account for tennis step if passed
    
    if (showPickleballRating) {
      return step + 1; // Pickleball is step 4 or 5 depending on tennis
    }
    if (selectedSports.includes('pickleball')) step++; // Account for pickleball step if passed
    
    if (showPlayerPreferences) {
      return step + 1;
    }
    step++; // Account for preferences step
    
    if (showPlayerAvailabilities) {
      return step + 1;
    }
    
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
    setAuthMode('signup'); // Set mode to signup
    if (lastActiveOverlay) {
      // Resume from last active overlay
      Logger.logNavigation('resume_onboarding', { fromStep: lastActiveOverlay });
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
   * Start login flow for existing users
   * Opens auth overlay in login mode - skips onboarding
   */
  const startLogin = () => {
    Logger.logNavigation('start_login_flow', { mode: 'login' });
    setAuthMode('login'); // Set mode to login
    setShowAuthOverlay(true);
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
    Logger.logNavigation('auth_success', { nextStep: 'personal_info' });
    // Close auth overlay
    setShowAuthOverlay(false);

    // Show Personal Information overlay after auth completes
    scheduleTimer(() => {
      Logger.logNavigation('open_overlay', { overlay: 'PersonalInformationOverlay' });
      setShowPersonalInfo(true);
    }, ANIMATION_DELAYS.OVERLAY_TRANSITION);
  };

  const handleAcceptLocation = () => {
    Logger.logUserAction('permission_granted', { permission: 'location' });
    setShowLocationPermission(false);

    // Show Calendar overlay after location permission
    scheduleTimer(() => {
      Logger.logNavigation('open_overlay', { overlay: 'CalendarAccessOverlay' });
      setShowCalendarAccess(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
    // TODO: Request actual location permission
  };

  const handleRefuseLocation = () => {
    Logger.logUserAction('permission_denied', { permission: 'location' });
    setShowLocationPermission(false);

    // Show Calendar overlay even if location was refused
    scheduleTimer(() => {
      Logger.logNavigation('open_overlay', { overlay: 'CalendarAccessOverlay' });
      setShowCalendarAccess(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  const showCalendarOverlay = () => {
    Logger.logNavigation('show_overlay', { overlay: 'calendar_access' });
    setShowCalendarAccess(true);
  };

  const handleAcceptCalendar = () => {
    Logger.logUserAction('permission_granted', { permission: 'calendar' });
    setShowCalendarAccess(false);
    // TODO: Request actual calendar permission
  };

  const handleRefuseCalendar = () => {
    Logger.logUserAction('permission_denied', { permission: 'calendar' });
    setShowCalendarAccess(false);
  };

  const handlePersonalInfoContinue = () => {
    Logger.logNavigation('step_complete', { step: 'personal_info', nextStep: 'sport_selection' });
    setShowPersonalInfo(false);

    // Show Sport Selection overlay after personal info
    scheduleTimer(() => {
      Logger.logNavigation('open_overlay', { overlay: 'SportSelectionOverlay' });
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
    Logger.logNavigation('back_navigation', { from: 'personal_info', to: 'auth' });
    setShowPersonalInfo(false);
    scheduleTimer(() => {
      setShowAuthOverlay(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Back button handler - navigate to previous overlay (Personal)
   */
  const backFromSportSelection = () => {
    Logger.logNavigation('back_navigation', { from: 'sport_selection', to: 'personal_info' });
    setShowSportSelection(false);
    scheduleTimer(() => {
      setShowPersonalInfo(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Back button handler - navigate to previous overlay (Sport Selection)
   */
  const backFromTennisRating = () => {
    Logger.logNavigation('back_navigation', { from: 'tennis_rating', to: 'sport_selection' });
    setShowTennisRating(false);
    scheduleTimer(() => {
      setShowSportSelection(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Back button handler - navigate to previous overlay (Tennis or Sport)
   */
  const backFromPickleballRating = () => {
    const destination = selectedSports.includes('tennis') ? 'tennis_rating' : 'sport_selection';
    Logger.logNavigation('back_navigation', { from: 'pickleball_rating', to: destination });
    setShowPickleballRating(false);
    scheduleTimer(() => {
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
    let destination = 'sport_selection';
    if (selectedSports.includes('pickleball')) destination = 'pickleball_rating';
    else if (selectedSports.includes('tennis')) destination = 'tennis_rating';
    
    Logger.logNavigation('back_navigation', { from: 'preferences', to: destination });
    setShowPlayerPreferences(false);
    scheduleTimer(() => {
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
    Logger.logNavigation('back_navigation', { from: 'availabilities', to: 'preferences' });
    setShowPlayerAvailabilities(false);
    scheduleTimer(() => {
      setShowPlayerPreferences(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  const handleSportSelectionContinue = (sports: string[], sportIds?: string[]) => {
    Logger.logUserAction('sports_selected', { sports, count: sports.length, hasSportIds: !!sportIds });
    setSelectedSports(sports);
    if (sportIds) {
      setSelectedSportIds(sportIds);
      Logger.debug('sport_ids_stored', { sportIds, count: sportIds.length });
    }
    setShowSportSelection(false);

    // Determine which rating overlay to show based on selected sports
    scheduleTimer(() => {
      const hasTennis = sports.includes('tennis');
      const hasPickleball = sports.includes('pickleball');

      if (hasTennis) {
        // If tennis selected (with or without pickleball), show tennis rating first
        Logger.logNavigation('open_overlay', { overlay: 'TennisRatingOverlay' });
        setShowTennisRating(true);
      } else if (hasPickleball) {
        // If only pickleball selected, show pickleball rating
        Logger.logNavigation('open_overlay', { overlay: 'PickleballRatingOverlay' });
        setShowPickleballRating(true);
      } else {
        // No sports selected (shouldn't happen, but fallback to preferences)
        Logger.logNavigation('open_overlay', { overlay: 'PlayerPreferencesOverlay', reason: 'no_sports_selected' });
        setShowPlayerPreferences(true);
      }
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Close overlay without going back (simply dismiss)
   * Preserves progress for resume functionality
   */
  const closeSportSelection = () => {
    Logger.debug('close_overlay', { overlay: 'SportSelectionOverlay' });
    setShowSportSelection(false);
    setLastActiveOverlay('sport');
  };

  const handleTennisRatingContinue = (rating: string) => {
    Logger.logNavigation('step_complete', { step: 'tennis_rating', rating, nextStep: selectedSports.includes('pickleball') ? 'pickleball_rating' : 'preferences' });
    setShowTennisRating(false);

    // Check if pickleball was also selected
    scheduleTimer(() => {
      if (selectedSports.includes('pickleball')) {
        // Show pickleball rating next
        Logger.logNavigation('open_overlay', { overlay: 'PickleballRatingOverlay' });
        setShowPickleballRating(true);
      } else {
        // Go straight to preferences
        Logger.logNavigation('open_overlay', { overlay: 'PlayerPreferencesOverlay' });
        setShowPlayerPreferences(true);
      }
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Close overlay without going back (simply dismiss)
   * Preserves progress for resume functionality
   */
  const closeTennisRating = () => {
    Logger.debug('close_overlay', { overlay: 'TennisRatingOverlay' });
    setShowTennisRating(false);
    setLastActiveOverlay('tennis-rating');
  };

  const handlePickleballRatingContinue = (rating: string) => {
    Logger.logNavigation('step_complete', { step: 'pickleball_rating', rating, nextStep: 'preferences' });
    setShowPickleballRating(false);

    // Always go to preferences after pickleball rating
    scheduleTimer(() => {
      Logger.logNavigation('open_overlay', { overlay: 'PlayerPreferencesOverlay' });
      setShowPlayerPreferences(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Close overlay without going back (simply dismiss)
   * Preserves progress for resume functionality
   */
  const closePickleballRating = () => {
    Logger.debug('close_overlay', { overlay: 'PickleballRatingOverlay' });
    setShowPickleballRating(false);
    setLastActiveOverlay('pickleball-rating');
  };

  const handlePlayerPreferencesContinue = (_preferences: unknown) => {
    Logger.logNavigation('step_complete', { step: 'preferences', nextStep: 'availabilities' });
    setShowPlayerPreferences(false);

    // Show Player Availabilities overlay after preferences
    scheduleTimer(() => {
      Logger.logNavigation('open_overlay', { overlay: 'PlayerAvailabilitiesOverlay' });
      setShowPlayerAvailabilities(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Close overlay without going back (simply dismiss)
   * Preserves progress for resume functionality
   */
  const closePlayerPreferences = () => {
    Logger.debug('close_overlay', { overlay: 'PlayerPreferencesOverlay' });
    setShowPlayerPreferences(false);
    setLastActiveOverlay('preferences');
  };

  const handlePlayerAvailabilitiesContinue = (_availabilities: unknown) => {
    Logger.logNavigation('step_complete', { step: 'availabilities', nextStep: 'auth_success' });
    setShowPlayerAvailabilities(false);
    // TODO: In the future, persist data first, then show success overlay only if successful
    // For now, always show the success overlay
    scheduleTimer(() => {
      setShowAuthSuccess(true);
      // Clear last active overlay since onboarding is complete
      setLastActiveOverlay(null);
      Logger.info('onboarding_flow_completed', { message: 'User completed full onboarding flow' });
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  /**
   * Close overlay without going back (simply dismiss)
   * Preserves progress for resume functionality
   */
  const closePlayerAvailabilities = () => {
    Logger.debug('close_overlay', { overlay: 'PlayerAvailabilitiesOverlay' });
    setShowPlayerAvailabilities(false);
    setLastActiveOverlay('availabilities');
  };

  const showLocationPermissionOnMount = () => {
    Logger.logNavigation('show_overlay', { overlay: 'LocationPermissionOverlay', trigger: 'mount' });
    setShowLocationPermission(true);
  };

  /**
   * Close the AuthSuccessOverlay
   */
  const closeAuthSuccess = () => {
    Logger.debug('close_overlay', { overlay: 'AuthSuccessOverlay' });
    setShowAuthSuccess(false);
  };

  return {
    // State
    authMode,
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
    startLogin,
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


