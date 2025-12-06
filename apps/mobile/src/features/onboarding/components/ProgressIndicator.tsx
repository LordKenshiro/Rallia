import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@rallia/shared-constants';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

/**
 * Progress indicator for onboarding flow
 * Shows current step and progress bar
 * Note: Returns null if currentStep is 0 (permission overlays)
 */
const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep, totalSteps }) => {
  // Don't show progress indicator for permission overlays (currentStep = 0)
  if (currentStep === 0) {
    return null;
  }

  const progress = (currentStep / totalSteps) * 100;

  return (
    <View style={styles.container}>
      {/* Step counter */}
      <Text style={styles.stepText}>
        Step {currentStep} of {totalSteps}
      </Text>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.lightGray,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
});

export default ProgressIndicator;
