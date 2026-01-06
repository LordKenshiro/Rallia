'use client';

import { createContext, useContext } from 'react';
import type { OrganizationFormContextValue } from '@/hooks/useOrganizationForm';

export const OrganizationFormContext = createContext<OrganizationFormContextValue | null>(null);

/**
 * Main hook to access the organization form context
 */
export function useOrganizationFormContext() {
  const context = useContext(OrganizationFormContext);
  if (!context) {
    throw new Error('useOrganizationFormContext must be used within OrganizationFormProvider');
  }
  return context;
}

/**
 * Convenience hook for facility-related actions
 */
export function useFacilityActions() {
  const {
    handleFacilityChange,
    addFacility,
    removeFacility,
    handleImageUpload,
    removeImage,
    handleUseOrgAddressToggle,
    handleUseOrgContactToggle,
    getImageSrc,
    getImageIdentifier,
  } = useOrganizationFormContext();

  return {
    handleFacilityChange,
    addFacility,
    removeFacility,
    handleImageUpload,
    removeImage,
    handleUseOrgAddressToggle,
    handleUseOrgContactToggle,
    getImageSrc,
    getImageIdentifier,
  };
}

/**
 * Convenience hook for contact-related actions
 */
export function useContactActions() {
  const { addContact, removeContact, updateContact } = useOrganizationFormContext();
  return { addContact, removeContact, updateContact };
}

/**
 * Convenience hook for court-related actions
 */
export function useCourtActions() {
  const { addCourtRow, removeCourtRow, updateCourtRow } = useOrganizationFormContext();
  return { addCourtRow, removeCourtRow, updateCourtRow };
}

/**
 * Convenience hook for accessing form data
 */
export function useFormData() {
  const {
    orgData,
    facilities,
    sports,
    loadingSports,
    dataProviders,
    loadingDataProviders,
    isUpdateMode,
  } = useOrganizationFormContext();
  return {
    orgData,
    facilities,
    sports,
    loadingSports,
    dataProviders,
    loadingDataProviders,
    isUpdateMode,
  };
}

/**
 * Convenience hook for form submission state
 */
export function useFormSubmission() {
  const {
    isSubmitting,
    errorMessage,
    showSuccessModal,
    createdOrganization,
    setIsSubmitting,
    setErrorMessage,
    setShowSuccessModal,
    setCreatedOrganization,
    resetForm,
  } = useOrganizationFormContext();

  return {
    isSubmitting,
    errorMessage,
    showSuccessModal,
    createdOrganization,
    setIsSubmitting,
    setErrorMessage,
    setShowSuccessModal,
    setCreatedOrganization,
    resetForm,
  };
}
