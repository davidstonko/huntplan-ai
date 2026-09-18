/**
 * ErrorBoundary — Catches unhandled errors and shows a recovery screen.
 * Prevents single-component crashes from killing the entire app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <YourComponent />
 *   </ErrorBoundary>
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Colors from '../../theme/colors';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /**
   * Optional "Go back" action (e.g. pop the navigator). Shown as a second
   * button when provided; the boundary resets itself after calling it.
   */
  onGoBack?: () => boolean | void;
  /** Report hook (Sentry etc.). Never throws into the boundary. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    if (__DEV__) console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    try {
      this.props.onError?.(error, errorInfo);
    } catch {
      // Reporting must never take the recovery screen down with it.
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoBack = (): void => {
    try {
      this.props.onGoBack?.();
    } catch {
      // Fall through to a plain reset.
    }
    this.handleReset();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              This screen hit an unexpected error. Your maps, logs, and saved data are not affected. Restart the screen or go back to continue.
            </Text>
            {__DEV__ && this.state.error && (
              <ScrollView style={styles.debugScroll}>
                <Text style={styles.debugText}>
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </Text>
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.button}
              onPress={this.handleReset}
              accessibilityLabel="Restart this screen"
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Restart</Text>
            </TouchableOpacity>
            {this.props.onGoBack ? (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={this.handleGoBack}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Go back</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    padding: 24,
    alignItems: 'center',
    maxHeight: '90%',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  debugScroll: {
    backgroundColor: Colors.mdBlack,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    maxHeight: 200,
    width: '100%',
  },
  debugText: {
    fontSize: 10,
    color: Colors.mdGold,
    fontFamily: 'Courier New',
    lineHeight: 14,
  },
  button: {
    backgroundColor: Colors.mdRed,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textOnAccent,
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  secondaryButtonText: {
    color: Colors.textPrimary,
  },
});

export default ErrorBoundary;
