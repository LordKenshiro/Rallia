import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation';
import { ActionsBottomSheet } from './src/components/ActionsBottomSheet';
import { MatchDetailSheet } from './src/components/MatchDetailSheet';
import { SplashOverlay } from './src/components/SplashOverlay';
import { ErrorBoundary } from '@rallia/shared-components';
import { ThemeProvider, useTheme } from '@rallia/shared-hooks';
import { Logger } from './src/services/logger';
import {
  OverlayProvider,
  LocaleProvider,
  ActionsSheetProvider,
  SportProvider,
  MatchDetailSheetProvider,
} from './src/context';
import { ProfileProvider, PlayerProvider } from '@rallia/shared-hooks';

const queryClient = new QueryClient();

// IMPORTANT: Initialize Supabase with AsyncStorage before any other code runs
import './src/lib/supabase';

// Import NativeWind global styles (will be available after nativewind is installed)
import './global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function AppContent() {
  const { theme } = useTheme();

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
      {/* Splash overlay - renders on top of everything */}
      <SplashOverlay />
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
                <ProfileProvider>
                  <PlayerProvider>
                    <SportProvider>
                      <OverlayProvider>
                        <ActionsSheetProvider>
                          <MatchDetailSheetProvider>
                            <BottomSheetModalProvider>
                              <AppContent />
                            </BottomSheetModalProvider>
                          </MatchDetailSheetProvider>
                        </ActionsSheetProvider>
                      </OverlayProvider>
                    </SportProvider>
                  </PlayerProvider>
                </ProfileProvider>
              </ThemeProvider>
            </LocaleProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
