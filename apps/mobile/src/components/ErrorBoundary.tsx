/**
 * ErrorBoundary Component
 * Catches unhandled errors in the React component tree and displays a fallback UI
 * Prevents the entire app from crashing on native devices
 */
import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Logger } from '@rallia/shared-services';

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
      error: null 
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging and send to tracking service
    Logger.error('Unhandled error caught by ErrorBoundary', error, { 
      componentStack: errorInfo.componentStack 
    });
  }

  handleReset = () => {
    // Reset error state to attempt recovery
    this.setState({ 
      hasError: false, 
      error: null 
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={80} color="#EF6F7B" />
          </View>
          
          <Text style={styles.title}>Oops! Something went wrong</Text>
          
          <Text style={styles.subtitle}>
            We encountered an unexpected error. Don't worry, your data is safe.
          </Text>
          
          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
              <Text style={styles.errorMessage}>{this.state.error.message}</Text>
              {this.state.error.stack && (
                <Text style={styles.errorStack} numberOfLines={5}>
                  {this.state.error.stack}
                </Text>
              )}
            </View>
          )}
          
          <TouchableOpacity
            style={styles.resetButton}
            onPress={this.handleReset}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.resetButtonText}>Try Again</Text>
          </TouchableOpacity>
          
          <Text style={styles.helpText}>
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
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  errorDetails: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
    width: '100%',
    maxHeight: 200,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 12,
    color: '#EF6F7B',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  errorStack: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF6F7B',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    marginTop: 24,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
