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

  const startOnboarding = () => {
    setShowAuthOverlay(true);
    // Show location permission overlay at the same time with a slight delay
    setTimeout(() => {
      setShowLocationPermission(true);
    }, ANIMATION_DELAYS.OVERLAY_STAGGER);
  };

  const closeAuthOverlay = () => {
    setShowAuthOverlay(false);
  };

  const handleAuthSuccess = () => {
    console.log('Auth success - closing AuthOverlay');
    // Close auth overlay
    setShowAuthOverlay(false);
    
    // Show PersonalInformationOverlay after auth completes
    setTimeout(() => {
      console.log('Opening PersonalInformationOverlay');
      setShowPersonalInfo(true);
    }, ANIMATION_DELAYS.OVERLAY_TRANSITION);
  };

  const handleAcceptLocation = () => {
    console.log('Location permission accepted');
    setShowLocationPermission(false);
    // TODO: Request actual location permission
  };

  const handleRefuseLocation = () => {
    console.log('Location permission refused');
    setShowLocationPermission(false);
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
    // TODO: Complete onboarding flow
  };

  const closePersonalInfo = () => {
    setShowPersonalInfo(false);
  };

  return {
    // State
    showAuthOverlay,
    showLocationPermission,
    showCalendarAccess,
    showPersonalInfo,
    
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
  };
};
