import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Logger } from '@rallia/shared-services';
import { useProfile, usePlayerSports } from '@rallia/shared-hooks';
import {
  AuthOverlay,
  AuthSuccessOverlay,
  PersonalInformationOverlay,
  SportSelectionOverlay,
  TennisRatingOverlay,
  PickleballRatingOverlay,
  PlayerPreferencesOverlay,
  PlayerAvailabilitiesOverlay,
} from '../features/onboarding/components';
import {
  LocationPermissionOverlay,
  CalendarAccessOverlay,
} from '@rallia/shared-components';
import { useTimerCleanup } from '../hooks/useTimerCleanup';
import { ANIMATION_DELAYS } from '../constants';
import { useAuth, usePermissions } from '../hooks';

// =============================================================================
// TYPES
// =============================================================================

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

type AuthMode = 'signup' | 'login';

interface OverlayContextType {
  // Auth overlay
  showAuth: (mode?: AuthMode) => void;
  closeAuth: () => void;
  isAuthVisible: boolean;
  authMode: AuthMode;

  // Onboarding flow
  startOnboarding: () => void;
  startLogin: () => void;
  resumeOnboarding: () => void;
  
  // Notify that we're on home screen (safe to show permission overlays)
  setOnHomeScreen: (isOnHome: boolean) => void;
  
  // Check if onboarding is needed
  needsOnboarding: boolean;
  
  // Current step info (for progress indicator)
  currentStep: number;
  totalSteps: number;
  
  // Selected sports (for dynamic flow)
  selectedSports: string[];
  selectedSportIds: string[];
}

// =============================================================================
// CONTEXT
// =============================================================================

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface OverlayProviderProps {
  children: ReactNode;
}

export const OverlayProvider: React.FC<OverlayProviderProps> = ({ children }) => {
  const { scheduleTimer } = useTimerCleanup();
  const { session } = useAuth();
  const { profile, refetch: refetchProfile } = useProfile();
  const { playerSports } = usePlayerSports();
  
  // Permission handling
  const {
    shouldShowLocationOverlay,
    shouldShowCalendarOverlay,
    requestLocationPermission,
    requestCalendarPermission,
    markLocationAsked,
    markCalendarAsked,
    loading: permissionsLoading,
  } = usePermissions();

  // ==========================================================================
  // AUTH STATE
  // ==========================================================================
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);

  // ==========================================================================
  // PERMISSION OVERLAYS STATE
  // ==========================================================================
  const [showLocationPermission, setShowLocationPermission] = useState(false);
  const [showCalendarAccess, setShowCalendarAccess] = useState(false);
  const [isOnHomeScreen, setIsOnHomeScreen] = useState(false);

  // ==========================================================================
  // ONBOARDING OVERLAYS STATE
  // ==========================================================================
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showSportSelection, setShowSportSelection] = useState(false);
  const [showTennisRating, setShowTennisRating] = useState(false);
  const [showPickleballRating, setShowPickleballRating] = useState(false);
  const [showPlayerPreferences, setShowPlayerPreferences] = useState(false);
  const [showPlayerAvailabilities, setShowPlayerAvailabilities] = useState(false);
  const [showAuthSuccess, setShowAuthSuccess] = useState(false);

  // ==========================================================================
  // TRACKING STATE
  // ==========================================================================
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedSportIds, setSelectedSportIds] = useState<string[]>([]);
  const [lastActiveOverlay, setLastActiveOverlay] = useState<OnboardingStep>(null);

  // ==========================================================================
  // AUTO-SHOW PERMISSIONS WHEN ON HOME SCREEN
  // ==========================================================================
  useEffect(() => {
    // Only show permission overlays when:
    // 1. We're on the Home screen (not Landing)
    // 2. Permissions are loaded
    // 3. User hasn't been asked yet AND permission not already granted
    if (isOnHomeScreen && !permissionsLoading) {
      if (shouldShowLocationOverlay && !showLocationPermission && !showCalendarAccess) {
        const timer = setTimeout(() => {
          Logger.logNavigation('show_overlay', { overlay: 'LocationPermissionOverlay', trigger: 'auto_home' });
          setShowLocationPermission(true);
        }, 500); // Small delay to let the UI settle
        
        return () => clearTimeout(timer);
      }
    }
  }, [isOnHomeScreen, permissionsLoading, shouldShowLocationOverlay, showLocationPermission, showCalendarAccess]);

  // ==========================================================================
  // CLEAR LAST ACTIVE OVERLAY WHEN ONBOARDING IS COMPLETE
  // ==========================================================================
  useEffect(() => {
    // If user completed onboarding (possibly via UserProfile page), clear the last active overlay
    // This ensures the + button goes to Match screen even if user had closed an overlay earlier
    if (profile?.onboarding_completed && lastActiveOverlay) {
      Logger.logNavigation('clear_last_active_overlay', { 
        reason: 'onboarding_completed',
        previousOverlay: lastActiveOverlay 
      });
      setLastActiveOverlay(null);
    }
  }, [profile?.onboarding_completed, lastActiveOverlay]);

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================
  
  // Check if user needs to complete onboarding
  const needsOnboarding = !!(session?.user && profile && !profile.onboarding_completed);

  // Calculate current step
  const getCurrentStep = useCallback((): number => {
    if (showLocationPermission) return 0;
    if (showCalendarAccess) return 0;
    if (showAuthOverlay) return 1;
    if (showPersonalInfo) return 2;
    if (showSportSelection) return 3;
    
    let step = 3;
    
    if (showTennisRating) return step + 1;
    if (selectedSports.includes('tennis')) step++;
    
    if (showPickleballRating) return step + 1;
    if (selectedSports.includes('pickleball')) step++;
    
    if (showPlayerPreferences) return step + 1;
    step++;
    
    if (showPlayerAvailabilities) return step + 1;
    
    return 1;
  }, [
    showLocationPermission, showCalendarAccess, showAuthOverlay,
    showPersonalInfo, showSportSelection, showTennisRating,
    showPickleballRating, showPlayerPreferences, showPlayerAvailabilities,
    selectedSports
  ]);

  // Calculate total steps
  const getTotalSteps = useCallback((): number => {
    let total = 5; // Auth, Personal, Sport, Preferences, Availabilities
    if (selectedSports.includes('tennis')) total++;
    if (selectedSports.includes('pickleball')) total++;
    return total;
  }, [selectedSports]);

  const currentStep = getCurrentStep();
  const totalSteps = getTotalSteps();

  // ==========================================================================
  // AUTH HANDLERS
  // ==========================================================================

  const showAuth = useCallback((mode: AuthMode = 'signup') => {
    Logger.logNavigation('show_auth_overlay', { mode });
    setAuthMode(mode);
    setShowAuthOverlay(true);
  }, []);

  const closeAuth = useCallback(() => {
    setShowAuthOverlay(false);
    setLastActiveOverlay('auth');
  }, []);

  const handleAuthSuccess = useCallback(() => {
    Logger.logNavigation('auth_success', { nextStep: 'personal_info' });
    setShowAuthOverlay(false);

    scheduleTimer(() => {
      Logger.logNavigation('open_overlay', { overlay: 'PersonalInformationOverlay' });
      setShowPersonalInfo(true);
    }, ANIMATION_DELAYS.OVERLAY_TRANSITION);
  }, [scheduleTimer]);

  // ==========================================================================
  // ONBOARDING FLOW HANDLERS
  // ==========================================================================

  const startOnboarding = useCallback(() => {
    setAuthMode('signup');
    if (lastActiveOverlay && lastActiveOverlay !== 'auth') {
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
      setShowAuthOverlay(true);
    }
  }, [lastActiveOverlay]);

  const startLogin = useCallback(() => {
    Logger.logNavigation('start_login_flow', { mode: 'login' });
    setAuthMode('login');
    setShowAuthOverlay(true);
  }, []);

  const resumeOnboarding = useCallback(() => {
    // Determine which step to resume based on actual profile/player data
    // This will be used when user has auth but incomplete onboarding
    if (!session?.user) {
      showAuth('signup');
      return;
    }

    Logger.logNavigation('resume_onboarding_check', { 
      userId: session.user.id,
      hasProfile: !!profile,
      hasFullName: !!profile?.full_name,
      playerSportsCount: playerSports.length,
      onboardingCompleted: profile?.onboarding_completed,
      lastActiveOverlay
    });

    // PRIORITY 1: If user closed an overlay manually, resume from that overlay
    if (lastActiveOverlay) {
      Logger.logNavigation('resume_onboarding', { step: lastActiveOverlay, reason: 'last_active_overlay' });
      switch (lastActiveOverlay) {
        case 'personal':
          setShowPersonalInfo(true);
          return;
        case 'sport':
          setShowSportSelection(true);
          return;
        case 'tennis-rating':
          setShowTennisRating(true);
          return;
        case 'pickleball-rating':
          setShowPickleballRating(true);
          return;
        case 'preferences':
          setShowPlayerPreferences(true);
          return;
        case 'availabilities':
          setShowPlayerAvailabilities(true);
          return;
      }
    }

    // PRIORITY 2: Check database state to determine where user should resume

    // Step 1: Check if personal info is missing (full_name is required in PersonalInformationOverlay)
    if (!profile?.full_name) {
      Logger.logNavigation('resume_onboarding', { step: 'personal_info', reason: 'missing_full_name' });
      setShowPersonalInfo(true);
      return;
    }

    // Step 2: Check if no sports selected
    if (playerSports.length === 0) {
      Logger.logNavigation('resume_onboarding', { step: 'sport_selection', reason: 'no_sports_selected' });
      setShowSportSelection(true);
      return;
    }

    // Step 3: Get sport names and store them for the flow
    const sportNames = playerSports.map(ps => {
      const sport = Array.isArray(ps.sport) ? ps.sport[0] : ps.sport;
      return sport?.name?.toLowerCase() || '';
    });
    setSelectedSports(sportNames);
    setSelectedSportIds(playerSports.map(ps => ps.sport_id));

    // Step 4: Check if preferences are needed
    const hasPreferences = playerSports.some(ps => 
      ps.preferred_match_duration || ps.preferred_match_type
    );

    if (!hasPreferences) {
      Logger.logNavigation('resume_onboarding', { step: 'preferences', reason: 'no_preferences_set' });
      setShowPlayerPreferences(true);
      return;
    }

    // Step 5: Show availabilities as the last step
    Logger.logNavigation('resume_onboarding', { step: 'availabilities', reason: 'preferences_complete' });
    setShowPlayerAvailabilities(true);
  }, [session, profile, playerSports, lastActiveOverlay, showAuth]);

  // ==========================================================================
  // PERMISSION HANDLERS (with native permission requests)
  // ==========================================================================

  const handleAcceptLocation = useCallback(async () => {
    // Request actual native location permission
    const granted = await requestLocationPermission();
    Logger.logUserAction('permission_result', { permission: 'location', granted });
    
    setShowLocationPermission(false);
    
    // Show calendar overlay if needed
    scheduleTimer(() => {
      if (shouldShowCalendarOverlay) {
        setShowCalendarAccess(true);
      }
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  }, [scheduleTimer, requestLocationPermission, shouldShowCalendarOverlay]);

  const handleRefuseLocation = useCallback(async () => {
    // Mark as asked but don't request native permission
    await markLocationAsked();
    Logger.logUserAction('permission_refused', { permission: 'location' });
    
    setShowLocationPermission(false);
    
    // Show calendar overlay if needed
    scheduleTimer(() => {
      if (shouldShowCalendarOverlay) {
        setShowCalendarAccess(true);
      }
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  }, [scheduleTimer, markLocationAsked, shouldShowCalendarOverlay]);

  const handleAcceptCalendar = useCallback(async () => {
    // Request actual native calendar permission
    const granted = await requestCalendarPermission();
    Logger.logUserAction('permission_result', { permission: 'calendar', granted });
    setShowCalendarAccess(false);
  }, [requestCalendarPermission]);

  const handleRefuseCalendar = useCallback(async () => {
    // Mark as asked but don't request native permission
    await markCalendarAsked();
    Logger.logUserAction('permission_refused', { permission: 'calendar' });
    setShowCalendarAccess(false);
  }, [markCalendarAsked]);

  // ==========================================================================
  // ONBOARDING NAVIGATION HANDLERS
  // ==========================================================================

  const closePersonalInfo = useCallback(() => {
    setShowPersonalInfo(false);
    setLastActiveOverlay('personal');
  }, []);

  const backFromPersonalInfo = useCallback(() => {
    Logger.logNavigation('back_navigation', { from: 'personal_info', to: 'auth' });
    setShowPersonalInfo(false);
    scheduleTimer(() => {
      setShowAuthOverlay(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  }, [scheduleTimer]);

  const handlePersonalInfoContinue = useCallback(() => {
    Logger.logNavigation('step_complete', { step: 'personal_info', nextStep: 'sport_selection' });
    setShowPersonalInfo(false);
    scheduleTimer(() => {
      setShowSportSelection(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  }, [scheduleTimer]);

  const closeSportSelection = useCallback(() => {
    setShowSportSelection(false);
    setLastActiveOverlay('sport');
  }, []);

  const backFromSportSelection = useCallback(() => {
    Logger.logNavigation('back_navigation', { from: 'sport_selection', to: 'personal_info' });
    setShowSportSelection(false);
    scheduleTimer(() => {
      setShowPersonalInfo(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  }, [scheduleTimer]);

  const handleSportSelectionContinue = useCallback((sports: string[], sportIds: string[]) => {
    Logger.logNavigation('step_complete', { step: 'sport_selection', selectedSports: sports });
    setSelectedSports(sports);
    setSelectedSportIds(sportIds);
    setShowSportSelection(false);

    scheduleTimer(() => {
      if (sports.includes('tennis')) {
        setShowTennisRating(true);
      } else if (sports.includes('pickleball')) {
        setShowPickleballRating(true);
      } else {
        setShowPlayerPreferences(true);
      }
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  }, [scheduleTimer]);

  const closeTennisRating = useCallback(() => {
    setShowTennisRating(false);
    setLastActiveOverlay('tennis-rating');
  }, []);

  const backFromTennisRating = useCallback(() => {
    Logger.logNavigation('back_navigation', { from: 'tennis_rating', to: 'sport_selection' });
    setShowTennisRating(false);
    scheduleTimer(() => {
      setShowSportSelection(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  }, [scheduleTimer]);

  const handleTennisRatingContinue = useCallback(() => {
    Logger.logNavigation('step_complete', { step: 'tennis_rating' });
    setShowTennisRating(false);
    scheduleTimer(() => {
      if (selectedSports.includes('pickleball')) {
        setShowPickleballRating(true);
      } else {
        setShowPlayerPreferences(true);
      }
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  }, [selectedSports, scheduleTimer]);

  const closePickleballRating = useCallback(() => {
    setShowPickleballRating(false);
    setLastActiveOverlay('pickleball-rating');
  }, []);

  const backFromPickleballRating = useCallback(() => {
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
  }, [selectedSports, scheduleTimer]);

  const handlePickleballRatingContinue = useCallback(() => {
    Logger.logNavigation('step_complete', { step: 'pickleball_rating' });
    setShowPickleballRating(false);
    scheduleTimer(() => {
      setShowPlayerPreferences(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  }, [scheduleTimer]);

  const closePlayerPreferences = useCallback(() => {
    setShowPlayerPreferences(false);
    setLastActiveOverlay('preferences');
  }, []);

  const backFromPlayerPreferences = useCallback(() => {
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
  }, [selectedSports, scheduleTimer]);

  const handlePlayerPreferencesContinue = useCallback(() => {
    Logger.logNavigation('step_complete', { step: 'preferences', nextStep: 'availabilities' });
    setShowPlayerPreferences(false);
    scheduleTimer(() => {
      setShowPlayerAvailabilities(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  }, [scheduleTimer]);

  const closePlayerAvailabilities = useCallback(() => {
    setShowPlayerAvailabilities(false);
    setLastActiveOverlay('availabilities');
  }, []);

  const backFromPlayerAvailabilities = useCallback(() => {
    Logger.logNavigation('back_navigation', { from: 'availabilities', to: 'preferences' });
    setShowPlayerAvailabilities(false);
    scheduleTimer(() => {
      setShowPlayerPreferences(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  }, [scheduleTimer]);

  const handlePlayerAvailabilitiesContinue = useCallback(() => {
    Logger.logNavigation('onboarding_complete', { step: 'availabilities' });
    setShowPlayerAvailabilities(false);
    setLastActiveOverlay(null); // Clear resume point
    
    // Refetch profile to get updated onboarding_completed status
    refetchProfile();
    
    scheduleTimer(() => {
      setShowAuthSuccess(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  }, [scheduleTimer, refetchProfile]);

  const closeAuthSuccess = useCallback(() => {
    setShowAuthSuccess(false);
  }, []);

  // ==========================================================================
  // HOME SCREEN NOTIFICATION
  // ==========================================================================
  
  const handleSetOnHomeScreen = useCallback((isOnHome: boolean) => {
    Logger.logNavigation('home_screen_state', { isOnHome });
    setIsOnHomeScreen(isOnHome);
  }, []);

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================

  const contextValue: OverlayContextType = {
    showAuth,
    closeAuth,
    isAuthVisible: showAuthOverlay,
    authMode,
    startOnboarding,
    startLogin,
    resumeOnboarding,
    setOnHomeScreen: handleSetOnHomeScreen,
    needsOnboarding,
    currentStep,
    totalSteps,
    selectedSports,
    selectedSportIds,
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <OverlayContext.Provider value={contextValue}>
      {children}

      {/* Auth Overlay - Can be triggered from anywhere */}
      <AuthOverlay
        visible={showAuthOverlay}
        onClose={closeAuth}
        onAuthSuccess={handleAuthSuccess}
        onReturningUser={() => {
          Logger.debug('returning_user_skip_onboarding');
          closeAuth();
        }}
        currentStep={currentStep}
        totalSteps={totalSteps}
        mode={authMode}
      />

      {/* Location Permission Overlay */}
      <LocationPermissionOverlay
        visible={showLocationPermission}
        onAccept={handleAcceptLocation}
        onRefuse={handleRefuseLocation}
      />

      {/* Calendar Access Overlay */}
      <CalendarAccessOverlay
        visible={showCalendarAccess}
        onAccept={handleAcceptCalendar}
        onRefuse={handleRefuseCalendar}
      />

      {/* Personal Information Overlay */}
      <PersonalInformationOverlay
        visible={showPersonalInfo}
        onClose={closePersonalInfo}
        onBack={backFromPersonalInfo}
        onContinue={handlePersonalInfoContinue}
        currentStep={currentStep}
        totalSteps={totalSteps}
      />

      {/* Sport Selection Overlay */}
      <SportSelectionOverlay
        visible={showSportSelection}
        onClose={closeSportSelection}
        onBack={backFromSportSelection}
        onContinue={handleSportSelectionContinue}
        currentStep={currentStep}
        totalSteps={totalSteps}
      />

      {/* Tennis Rating Overlay */}
      <TennisRatingOverlay
        visible={showTennisRating}
        onClose={closeTennisRating}
        onBack={backFromTennisRating}
        onContinue={handleTennisRatingContinue}
        currentStep={currentStep}
        totalSteps={totalSteps}
      />

      {/* Pickleball Rating Overlay */}
      <PickleballRatingOverlay
        visible={showPickleballRating}
        onClose={closePickleballRating}
        onBack={backFromPickleballRating}
        onContinue={handlePickleballRatingContinue}
        currentStep={currentStep}
        totalSteps={totalSteps}
      />

      {/* Player Preferences Overlay */}
      <PlayerPreferencesOverlay
        visible={showPlayerPreferences}
        onClose={closePlayerPreferences}
        onBack={backFromPlayerPreferences}
        onContinue={handlePlayerPreferencesContinue}
        selectedSports={selectedSports}
        currentStep={currentStep}
        totalSteps={totalSteps}
      />

      {/* Player Availabilities Overlay */}
      <PlayerAvailabilitiesOverlay
        visible={showPlayerAvailabilities}
        onClose={closePlayerAvailabilities}
        onBack={backFromPlayerAvailabilities}
        onContinue={handlePlayerAvailabilitiesContinue}
        selectedSportIds={selectedSportIds}
        currentStep={currentStep}
        totalSteps={totalSteps}
      />

      {/* Auth Success Overlay */}
      <AuthSuccessOverlay
        visible={showAuthSuccess}
        onClose={closeAuthSuccess}
      />
    </OverlayContext.Provider>
  );
};

// =============================================================================
// HOOK
// =============================================================================

export const useOverlay = (): OverlayContextType => {
  const context = useContext(OverlayContext);
  if (context === undefined) {
    throw new Error('useOverlay must be used within an OverlayProvider');
  }
  return context;
};

export default OverlayContext;
