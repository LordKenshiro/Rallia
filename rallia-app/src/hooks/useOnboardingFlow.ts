import { useState } from 'react';
import { ANIMATION_DELAYS } from '../constants';

type OnboardingStep = 'auth' | 'location' | 'calendar' | 'personal' | null;

/**
 * Custom hook for managing the onboarding flow overlays
 * Handles visibility state for all onboarding overlays
 */
export const useOnboardingFlow = () => {
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [showLocationPermission, setShowLocationPermission] = useState(false);
  const [showCalendarAccess, setShowCalendarAccess] = useState(false);
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showSportSelection, setShowSportSelection] = useState(false);

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

  const handleSportSelectionContinue = (selectedSports: string[]) => {
    console.log('Sport selection completed:', selectedSports);
    setShowSportSelection(false);
    // TODO: Save selected sports and complete onboarding flow
  };

  const closeSportSelection = () => {
    console.log('Closing SportSelectionOverlay and reopening PersonalInformationOverlay');
    setShowSportSelection(false);
    
    // Show Personal Information overlay again
    setTimeout(() => {
      setShowPersonalInfo(true);
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
    showLocationPermissionOnMount,
  };
};
