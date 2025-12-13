import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import AppNavigator from './src/navigation/AppNavigator';
import { ActionsBottomSheet } from './src/components/ActionsBottomSheet';
import { ErrorBoundary } from '@rallia/shared-components';
import { ThemeProvider } from './src/hooks/useTheme';
import { Logger } from './src/services/logger';
import {
  OverlayProvider,
  LocaleProvider,
  ActionsSheetProvider,
  SportProvider,
} from './src/context';

const queryClient = new QueryClient();

// IMPORTANT: Initialize Supabase with AsyncStorage before any other code runs
import './src/lib/supabase';

// Import NativeWind global styles (will be available after nativewind is installed)
import './global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
                <SportProvider>
                  <OverlayProvider>
                    <ActionsSheetProvider>
                      <BottomSheetModalProvider>
                        <NavigationContainer>
                          <AppNavigator />
                        </NavigationContainer>
                        {/* Actions Bottom Sheet - renders above navigation */}
                        <ActionsBottomSheet />
                      </BottomSheetModalProvider>
                    </ActionsSheetProvider>
                  </OverlayProvider>
                </SportProvider>
              </ThemeProvider>
            </LocaleProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
