/**
 * ErrorBoundary Component
 * Catches unhandled errors in the React component tree and displays a fallback UI
 * Prevents the entire app from crashing on native devices
 */
import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Logger } from '@rallia/shared-services';
import {
  spacingPixels,
  radiusPixels,
  fontSizePixels,
  fontWeightNumeric,
  status,
  lightTheme,
  neutral,
} from '@rallia/design-system';

const BASE_WHITE = '#ffffff';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging and send to tracking service
    Logger.error('Unhandled error caught by ErrorBoundary', error, {
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    // Reset error state to attempt recovery
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use light theme colors as fallback (ErrorBoundary can't use hooks)
      // Using design system tokens for consistency
      const colors = {
        background: lightTheme.background,
        text: lightTheme.foreground,
        textMuted: lightTheme.mutedForeground,
        textSecondary: neutral[500],
        error: status.error.DEFAULT,
        card: lightTheme.card,
        primaryForeground: BASE_WHITE,
      };

      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={80} color={colors.error} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Oops! Something went wrong</Text>

          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            We encountered an unexpected error. Don't worry, your data is safe.
          </Text>

          {__DEV__ && this.state.error && (
            <View style={[styles.errorDetails, { backgroundColor: colors.card }]}>
              <Text style={[styles.errorTitle, { color: colors.text }]}>
                Error Details (Dev Only):
              </Text>
              <Text style={[styles.errorMessage, { color: colors.error }]}>
                {this.state.error.message}
              </Text>
              {this.state.error.stack && (
                <Text
                  style={[styles.errorStack, { color: colors.textSecondary }]}
                  numberOfLines={5}
                >
                  {this.state.error.stack}
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: colors.error }]}
            onPress={this.handleReset}
            activeOpacity={0.8}
          >
            <Ionicons
              name="refresh"
              size={20}
              color={colors.primaryForeground}
              style={styles.buttonIcon}
            />
            <Text style={[styles.resetButtonText, { color: colors.primaryForeground }]}>
              Try Again
            </Text>
          </TouchableOpacity>

          <Text style={[styles.helpText, { color: colors.textSecondary }]}>
            If this problem persists, please contact support
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacingPixels[6],
  },
  iconContainer: {
    marginBottom: spacingPixels[6],
  },
  title: {
    fontSize: fontSizePixels['2xl'],
    fontWeight: fontWeightNumeric.bold,
    marginBottom: spacingPixels[3],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizePixels.base,
    textAlign: 'center',
    marginBottom: spacingPixels[6],
    lineHeight: fontSizePixels.base * 1.375,
    paddingHorizontal: spacingPixels[5],
  },
  errorDetails: {
    borderRadius: radiusPixels.lg,
    padding: spacingPixels[4],
    marginVertical: spacingPixels[4],
    width: '100%',
    maxHeight: 200, // 50 * 4px base unit
  },
  errorTitle: {
    fontSize: fontSizePixels.sm,
    fontWeight: fontWeightNumeric.semibold,
    marginBottom: spacingPixels[2],
  },
  errorMessage: {
    fontSize: fontSizePixels.xs,
    marginBottom: spacingPixels[2],
    fontFamily: 'monospace',
  },
  errorStack: {
    fontSize: fontSizePixels.xs - 2,
    fontFamily: 'monospace',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[8],
    paddingVertical: spacingPixels[3.5],
    borderRadius: radiusPixels.lg,
    marginTop: spacingPixels[2],
  },
  buttonIcon: {
    marginRight: spacingPixels[2],
  },
  resetButtonText: {
    fontSize: fontSizePixels.base,
    fontWeight: fontWeightNumeric.semibold,
  },
  helpText: {
    marginTop: spacingPixels[6],
    fontSize: fontSizePixels.sm,
    textAlign: 'center',
  },
});
