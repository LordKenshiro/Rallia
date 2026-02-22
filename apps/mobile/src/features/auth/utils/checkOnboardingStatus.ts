/**
 * Shared Authentication Utilities
 *
 * Centralized utilities for auth-related operations to ensure
 * consistent behavior across different auth flows.
 */

import { ProfileService, Logger } from '@rallia/shared-services';

/**
 * Check if a user needs to complete onboarding
 *
 * This is used after successful authentication to determine
 * whether to navigate to onboarding or the main app.
 *
 * @param userId - The authenticated user's ID
 * @returns true if onboarding is needed, false if already completed
 */
export async function checkOnboardingStatus(userId: string): Promise<boolean> {
  try {
    const { data: profile, error } = await ProfileService.getProfile(userId);

    if (error) {
      const errorCode = (error as { code?: string })?.code;
      // PGRST116 = no rows found, meaning new user without profile
      if (errorCode === 'PGRST116') {
        Logger.debug('No profile found - new user needs onboarding', { userId });
        return true;
      }
      Logger.error('Failed to fetch profile for onboarding check', error as Error, { userId });
      // Default to needing onboarding on error to be safe
      return true;
    }

    const needsOnboarding = !profile?.onboarding_completed;
    Logger.debug('Onboarding status checked', {
      userId,
      needsOnboarding,
      onboardingCompleted: profile?.onboarding_completed ?? false,
    });

    return needsOnboarding;
  } catch (error) {
    Logger.error('Error checking onboarding status', error as Error, { userId });
    // Default to needing onboarding on error to be safe
    return true;
  }
}
