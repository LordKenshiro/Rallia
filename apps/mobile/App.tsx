/**
 * IMPORTANT: Initialize Supabase with AsyncStorage FIRST
 * This must be the first import that touches @rallia/shared-services
 * to ensure the supabase client is properly configured before any hooks use it.
 */
import './src/lib/supabase';

import { useEffect, type PropsWithChildren } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation';
import { ActionsBottomSheet } from './src/components/ActionsBottomSheet';
import { MatchDetailSheet } from './src/components/MatchDetailSheet';
import { PlayerInviteSheet } from './src/components/PlayerInviteSheet';
import { FeedbackSheet } from './src/components/FeedbackSheet';
import { SplashOverlay } from './src/components/SplashOverlay';
import { SportSelectionOverlay } from './src/components/SportSelectionOverlay';
import { ErrorBoundary } from '@rallia/shared-components';
import {
  ThemeProvider,
  useTheme,
  ProfileProvider,
  PlayerProvider,
  useNotificationRealtime,
  usePendingFeedbackCheck,
} from '@rallia/shared-hooks';
import { Logger } from './src/services/logger';
import {
  AuthProvider,
  useAuth,
  OverlayProvider,
  LocaleProvider,
  useLocale,
  ActionsSheetProvider,
  SportProvider,
  MatchDetailSheetProvider,
  PlayerInviteSheetProvider,
  FeedbackSheetProvider,
  useFeedbackSheet,
  DeepLinkProvider,
  useDeepLink,
  useOverlay,
  useSport,
} from './src/context';
import { usePushNotifications } from './src/hooks';

// Import NativeWind global styles
import './global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 2 minutes - prevents unnecessary refetches
      staleTime: 1000 * 60 * 2,
      // Don't refetch on window focus by default (use pull-to-refresh instead)
      refetchOnWindowFocus: false,
      // Don't refetch on mount if data is fresh
      refetchOnMount: 'always',
      // Keep unused data in cache for 5 minutes
      gcTime: 1000 * 60 * 5,
      // Retry failed requests once
      retry: 1,
    },
  },
});

/**
 * AuthenticatedProviders - Wraps providers that need userId from auth context.
 * This component sits inside AuthProvider and passes userId to ProfileProvider and PlayerProvider.
 */
function AuthenticatedProviders({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const { syncLocaleToDatabase, isReady: isLocaleReady } = useLocale();
  const { setPendingMatchId } = useDeepLink();
  const { isSplashComplete } = useOverlay();
  const userId = user?.id;

  // Register push notifications when user is authenticated
  // This will save the Expo push token to the player table
  // Pass the deep link handler for match notifications
  // Wait for splash to complete before handling cold start notifications
  usePushNotifications(userId, true, {
    onMatchNotificationTapped: setPendingMatchId,
    isSplashComplete,
  });

  // Subscribe to realtime notification updates
  // This keeps the notification badge in sync with the database
  useNotificationRealtime(userId);

  // Sync locale to database when user logs in or locale becomes ready
  // This ensures server-side notifications use the correct locale
  useEffect(() => {
    if (userId && isLocaleReady) {
      syncLocaleToDatabase(userId);
    }
  }, [userId, isLocaleReady, syncLocaleToDatabase]);

  return (
    <ProfileProvider userId={userId}>
      <PlayerProvider userId={userId}>
        <SportProvider userId={userId}>{children}</SportProvider>
      </PlayerProvider>
    </ProfileProvider>
  );
}

/**
 * PendingFeedbackHandler - Opens FeedbackSheet for pending feedback on app launch.
 * Checks for matches in the 48h feedback window where user hasn't completed feedback.
 */
function PendingFeedbackHandler() {
  const { user } = useAuth();
  const { isSplashComplete, isSportSelectionComplete } = useOverlay();
  const { openSheet } = useFeedbackSheet();

  // Check for pending feedback when splash and sport selection are complete
  usePendingFeedbackCheck({
    userId: user?.id,
    enabled: isSplashComplete && isSportSelectionComplete && !!user?.id,
    onMatchFound: data => {
      Logger.logNavigation('pending_feedback_found', {
        matchId: data.matchId,
        opponentsCount: data.opponents.length,
      });
      // Small delay to ensure the UI is ready
      setTimeout(() => {
        openSheet(data.matchId, data.reviewerId, data.participantId, data.opponents);
      }, 500);
    },
  });

  return null;
}

function AppContent() {
  const { theme } = useTheme();
  const {
    setSplashComplete,
    showSportSelectionOverlay,
    isSplashComplete,
    onSportSelectionComplete,
  } = useOverlay();
  const { setSelectedSportsOrdered } = useSport();

  // Handle sport selection completion - update SportContext and notify OverlayContext
  const handleSportSelectionComplete = async (
    orderedSports: Parameters<typeof setSelectedSportsOrdered>[0]
  ) => {
    // Update SportContext with the ordered selection
    await setSelectedSportsOrdered(orderedSports);
    // Notify OverlayContext that selection is complete
    onSportSelectionComplete(orderedSports);
  };

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
      </NavigationContainer>
      {/* Actions Bottom Sheet - renders above navigation */}
      <ActionsBottomSheet />
      {/* Match Detail Bottom Sheet - shows when match card is pressed */}
      <MatchDetailSheet />
      {/* Player Invite Bottom Sheet - shows when host invites players */}
      <PlayerInviteSheet />
      {/* Feedback Bottom Sheet - shows when providing post-match feedback */}
      <FeedbackSheet />
      {/* Pending Feedback Handler - auto-opens FeedbackSheet on app launch if needed */}
      <PendingFeedbackHandler />
      {/* Sport Selection Overlay - shows for first-time users after splash */}
      <SportSelectionOverlay
        visible={showSportSelectionOverlay}
        startAnimation={isSplashComplete}
        onComplete={handleSportSelectionComplete}
      />
      {/* Splash overlay - renders on top of everything */}
      <SplashOverlay onAnimationComplete={() => setSplashComplete(true)} />
    </>
  );
}

export default function App() {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log unhandled errors with full context
    Logger.error('Unhandled app error', error, {
      componentStack: errorInfo.componentStack,
    });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary onError={handleError}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <LocaleProvider>
              <ThemeProvider>
                <DeepLinkProvider>
                  <OverlayProvider>
                    <AuthProvider>
                      <AuthenticatedProviders>
                        <ActionsSheetProvider>
                          <MatchDetailSheetProvider>
                            <PlayerInviteSheetProvider>
                              <FeedbackSheetProvider>
                                <BottomSheetModalProvider>
                                  <AppContent />
                                </BottomSheetModalProvider>
                              </FeedbackSheetProvider>
                            </PlayerInviteSheetProvider>
                          </MatchDetailSheetProvider>
                        </ActionsSheetProvider>
                      </AuthenticatedProviders>
                    </AuthProvider>
                  </OverlayProvider>
                </DeepLinkProvider>
              </ThemeProvider>
            </LocaleProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
