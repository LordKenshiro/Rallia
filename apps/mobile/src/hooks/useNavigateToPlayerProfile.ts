/**
 * Hook to navigate to a player's public profile, or open the auth sheet
 * if the user is not signed in or has not completed onboarding.
 *
 * Use this instead of navigation.navigate('PlayerProfile', ...) everywhere
 * so that guests and users mid-onboarding are prompted to sign in / finish
 * onboarding rather than viewing another player's profile.
 */

import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '@rallia/shared-hooks';
import { useActionsSheet } from '../context/ActionsSheetContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function useNavigateToPlayerProfile(): (playerId: string, sportId?: string) => void {
  const navigation = useNavigation<NavigationProp>();
  const { session } = useAuth();
  const { profile } = useProfile();
  const { openSheet } = useActionsSheet();

  return useCallback(
    (playerId: string, sportId?: string) => {
      const isSignedIn = Boolean(session?.user);
      const hasCompletedOnboarding = Boolean(profile?.onboarding_completed);

      if (!isSignedIn || !hasCompletedOnboarding) {
        openSheet();
        return;
      }

      navigation.navigate('PlayerProfile', { playerId, sportId });
    },
    [session?.user, profile?.onboarding_completed, navigation, openSheet]
  );
}
