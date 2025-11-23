import { useState } from 'react';
import { ANIMATION_DELAYS } from '../constants';

type OnboardingStep = 'auth' | 'location' | 'calendar' | 'personal' | 'sport' | 'tennis-rating' | 'pickleball-rating' | 'preferences' | null;

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
  
  // Track which sports were selected
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  const startOnboarding = () => {
    setShowAuthOverlay(true);
  };

  const closeAuthOverlay = () => {
    setShowAuthOverlay(false);
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

  const closePersonalInfo = () => {
    setShowPersonalInfo(false);
  };

  const handleSportSelectionContinue = (sports: string[]) => {
    console.log('Sport selection completed:', sports);
    setSelectedSports(sports);
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

  const closeSportSelection = () => {
    console.log('Closing SportSelectionOverlay and reopening PersonalInformationOverlay');
    setShowSportSelection(false);
    
    // Show Personal Information overlay again
    setTimeout(() => {
      setShowPersonalInfo(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
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

  const closeTennisRating = () => {
    console.log('Closing TennisRatingOverlay and reopening SportSelectionOverlay');
    setShowTennisRating(false);
    
    setTimeout(() => {
      setShowSportSelection(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
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

  const closePickleballRating = () => {
    console.log('Closing PickleballRatingOverlay');
    setShowPickleballRating(false);
    
    // Return to tennis rating if it was shown, otherwise to sport selection
    setTimeout(() => {
      if (selectedSports.includes('tennis')) {
        setShowTennisRating(true);
      } else {
        setShowSportSelection(true);
      }
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  const handlePlayerPreferencesContinue = (preferences: any) => {
    console.log('Player preferences completed:', preferences);
    setShowPlayerPreferences(false);
    // TODO: Save all onboarding data and complete the flow
    console.log('Onboarding flow completed!');
  };

  const closePlayerPreferences = () => {
    console.log('Closing PlayerPreferencesOverlay');
    setShowPlayerPreferences(false);
    
    // Return to last rating overlay
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

  const showLocationPermissionOnMount = () => {
    console.log('Showing LocationPermissionOverlay on mount');
    setShowLocationPermission(true);
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
    selectedSports,
    
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
    handleSportSelectionContinue,
    closeSportSelection,
    handleTennisRatingContinue,
    closeTennisRating,
    handlePickleballRatingContinue,
    closePickleballRating,
    handlePlayerPreferencesContinue,
    closePlayerPreferences,
    showLocationPermissionOnMount,
  };
};
