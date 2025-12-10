import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from '@rallia/shared-components';
import { Logger } from './src/services/logger';
import { OverlayProvider } from './src/context';

// IMPORTANT: Initialize Supabase with AsyncStorage before any other code runs
import './src/lib/supabase';

// Import NativeWind global styles (will be available after nativewind is installed)
import './global.css';

export default function App() {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log unhandled errors with full context
    Logger.error('Unhandled app error', error, {
      componentStack: errorInfo.componentStack,
    });
  };

  return (
    <ErrorBoundary onError={handleError}>
      <SafeAreaProvider>
        <OverlayProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </OverlayProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
