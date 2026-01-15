/**
 * Add Score Context
 *
 * Context provider for managing state across the Add Score flow.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type {
  MatchType,
  AddScoreFormData,
  AddScoreStep,
} from './types';
import { ADD_SCORE_STEPS } from './types';

interface AddScoreContextType {
  // Form data
  formData: Partial<AddScoreFormData>;
  updateFormData: (data: Partial<AddScoreFormData>) => void;
  resetFormData: () => void;

  // Navigation
  currentStep: AddScoreStep;
  currentStepIndex: number;
  goToNextStep: () => boolean;
  goToPreviousStep: () => boolean;
  canGoNext: boolean;
  canGoBack: boolean;
  isLastStep: boolean;

  // Match type
  matchType: MatchType | null;
  setMatchType: (type: MatchType) => void;
}

const AddScoreContext = createContext<AddScoreContextType | null>(null);

interface AddScoreProviderProps {
  children: React.ReactNode;
  initialMatchType?: MatchType;
  networkId?: string;
}

const initialFormData: Partial<AddScoreFormData> = {
  opponents: [],
  matchDate: new Date(),
  sport: 'tennis',
  expectation: 'competitive',
  sets: [{ team1Score: null, team2Score: null }],
};

export function AddScoreProvider({
  children,
  initialMatchType,
  networkId,
}: AddScoreProviderProps) {
  const [formData, setFormData] = useState<Partial<AddScoreFormData>>({
    ...initialFormData,
    matchType: initialMatchType,
    networkId,
  });
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [matchType, setMatchTypeState] = useState<MatchType | null>(initialMatchType || null);

  const currentStep = ADD_SCORE_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === ADD_SCORE_STEPS.length - 1;
  const canGoBack = currentStepIndex > 0;
  const canGoNext = currentStepIndex < ADD_SCORE_STEPS.length - 1;

  const updateFormData = useCallback((data: Partial<AddScoreFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const resetFormData = useCallback(() => {
    setFormData({
      ...initialFormData,
      networkId,
    });
    setCurrentStepIndex(0);
    setMatchTypeState(null);
  }, [networkId]);

  const setMatchType = useCallback((type: MatchType) => {
    setMatchTypeState(type);
    setFormData((prev) => ({ ...prev, matchType: type }));
  }, []);

  const goToNextStep = useCallback(() => {
    if (currentStepIndex < ADD_SCORE_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      return true;
    }
    return false;
  }, [currentStepIndex]);

  const goToPreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      return true;
    }
    return false;
  }, [currentStepIndex]);

  const value: AddScoreContextType = {
    formData,
    updateFormData,
    resetFormData,
    currentStep,
    currentStepIndex,
    goToNextStep,
    goToPreviousStep,
    canGoNext,
    canGoBack,
    isLastStep,
    matchType,
    setMatchType,
  };

  return (
    <AddScoreContext.Provider value={value}>
      {children}
    </AddScoreContext.Provider>
  );
}

export function useAddScore() {
  const context = useContext(AddScoreContext);
  if (!context) {
    throw new Error('useAddScore must be used within an AddScoreProvider');
  }
  return context;
}
