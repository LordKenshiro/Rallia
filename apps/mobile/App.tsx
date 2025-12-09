import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from '@rallia/shared-components';
import { ThemeProvider } from '@rallia/shared-hooks';
import { Logger } from './src/services/logger';
import { OverlayProvider } from './src/context';

// IMPORTANT: Initialize Supabase with AsyncStorage before any other code runs
import './src/lib/supabase';

export default function App() {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log unhandled errors with full context
    Logger.error('Unhandled app error', error, {
      componentStack: errorInfo.componentStack,
    });
  };

  return (
    <ErrorBoundary onError={handleError}>
      <ThemeProvider>
        <SafeAreaProvider>
          <OverlayProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </OverlayProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
