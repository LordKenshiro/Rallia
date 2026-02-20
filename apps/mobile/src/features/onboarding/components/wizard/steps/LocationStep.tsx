/**
 * LocationStep Component
 *
 * Second step of onboarding - collects optional address information.
 * Uses Google Places Autocomplete for address suggestions.
 * Postal code is pre-populated from pre-onboarding with an inline editor for corrections.
 * User can optionally add a specific address for more precise matching.
 * City and postal code are extracted from structured Google Places address components.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels, lightTheme, darkTheme } from '@rallia/design-system';
import { usePlacesAutocomplete } from '@rallia/shared-hooks';
import {
  selectionHaptic,
  isValidCanadianPostalCode,
  isPostalCodeInGreaterMontreal,
  formatPostalCodeInput,
} from '@rallia/shared-utils';
import type { TranslationKey } from '@rallia/shared-translations';
import type { PlacePrediction } from '@rallia/shared-types';
import type { OnboardingFormData } from '../../../hooks/useOnboardingWizard';
import { useUserHomeLocation } from '../../../../../context/UserLocationContext';

interface ThemeColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  buttonActive: string;
  buttonInactive: string;
  buttonTextActive: string;
  inputBackground: string;
  inputBorder: string;
  error: string;
}

interface LocationStepProps {
  formData: OnboardingFormData;
  onUpdateFormData: (updates: Partial<OnboardingFormData>) => void;
  colors: ThemeColors;
  t: (key: TranslationKey) => string;
  isDark: boolean;
}

export const LocationStep: React.FC<LocationStepProps> = ({
  formData,
  onUpdateFormData,
  colors,
  t,
  isDark,
}) => {
  // Get the pre-saved postal code from pre-onboarding
  const { homeLocation } = useUserHomeLocation();
  const [addressQuery, setAddressQuery] = useState(formData.address || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isEditingPostalCode, setIsEditingPostalCode] = useState(false);
  const [editedPostalCode, setEditedPostalCode] = useState('');
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null);

  // The displayed postal code: prefer form data (which reflects user edits) over homeLocation
  const displayPostalCode = formData.postalCode || homeLocation?.postalCode || '';

  // Google Places Autocomplete hook
  const {
    predictions,
    isLoading: isLoadingPredictions,
    clearPredictions,
    getPlaceDetails,
  } = usePlacesAutocomplete({
    searchQuery: addressQuery,
    enabled: showSuggestions && addressQuery.length >= 3,
    minQueryLength: 3,
    debounceMs: 300,
  });

  // Listen for keyboard events to adjust padding dynamically
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardShowListener = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  // Sync the pre-populated postal code and coordinates to form data on mount
  useEffect(() => {
    if (homeLocation && !formData.postalCode) {
      onUpdateFormData({
        postalCode: homeLocation.postalCode,
        latitude: homeLocation.latitude,
        longitude: homeLocation.longitude,
      });
    }
  }, [homeLocation, formData.postalCode, onUpdateFormData]);

  // Handle postal code editing
  const handleStartEditPostalCode = () => {
    setEditedPostalCode(formData.postalCode || displayPostalCode);
    setIsEditingPostalCode(true);
  };

  const handlePostalCodeChange = (text: string) => {
    setEditedPostalCode(formatPostalCodeInput(text));
    setPostalCodeError(null);
  };

  const handleSavePostalCode = () => {
    const trimmed = editedPostalCode.trim();
    if (!trimmed) {
      setIsEditingPostalCode(false);
      return;
    }

    if (!isValidCanadianPostalCode(trimmed)) {
      setPostalCodeError(t('preOnboarding.postalCode.errors.invalid'));
      return;
    }

    if (!isPostalCodeInGreaterMontreal(trimmed, 'CA')) {
      setPostalCodeError(t('preOnboarding.postalCode.errors.outOfCoverage'));
      return;
    }

    onUpdateFormData({ postalCode: trimmed });
    setPostalCodeError(null);
    setIsEditingPostalCode(false);
  };

  const handleCancelEditPostalCode = () => {
    setIsEditingPostalCode(false);
    setEditedPostalCode('');
    setPostalCodeError(null);
  };

  // Handle address input change
  const handleAddressChange = (text: string) => {
    setAddressQuery(text);
    setShowSuggestions(text.length >= 3);
    onUpdateFormData({ address: text });
  };

  // Dismiss suggestions when tapping outside the address input area
  const handleDismissSuggestions = useCallback(() => {
    if (showSuggestions) {
      setShowSuggestions(false);
    }
  }, [showSuggestions]);

  // Handle selecting a place from suggestions
  const handleSelectPlace = useCallback(
    async (prediction: PlacePrediction) => {
      selectionHaptic();
      setShowSuggestions(false);
      clearPredictions();

      // Set the address immediately
      const fullAddress = prediction.address
        ? `${prediction.name}, ${prediction.address}`
        : prediction.name;
      setAddressQuery(fullAddress);
      onUpdateFormData({ address: fullAddress });

      // Fetch place details to get coordinates and structured address components
      try {
        const details = await getPlaceDetails(prediction.placeId);
        if (details) {
          const updates: Partial<OnboardingFormData> = {
            address: details.address,
            latitude: details.latitude,
            longitude: details.longitude,
          };
          setAddressQuery(details.address);

          // Use structured address components (city, postal code) from Google Places API
          if (details.city) {
            updates.city = details.city;
          }
          if (details.postalCode) {
            updates.postalCode = details.postalCode;
          }

          onUpdateFormData(updates);
        }
      } catch (error) {
        console.error('Failed to get place details:', error);
      }
    },
    [clearPredictions, getPlaceDetails, onUpdateFormData]
  );

  // Render a single place suggestion
  const renderPrediction = ({ item }: { item: PlacePrediction }) => (
    <TouchableOpacity
      style={[
        styles.suggestionItem,
        {
          backgroundColor: colors.inputBackground,
          borderBottomColor: colors.border,
        },
      ]}
      onPress={() => handleSelectPlace(item)}
      activeOpacity={0.7}
    >
      <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
      <View style={styles.suggestionTextContainer}>
        <Text size="sm" weight="medium" color={colors.text} numberOfLines={1}>
          {item.name}
        </Text>
        {item.address && (
          <Text size="xs" color={colors.textSecondary} numberOfLines={1}>
            {item.address}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <BottomSheetScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : spacingPixels[8] },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      onScrollBeginDrag={handleDismissSuggestions}
    >
      {/* Title */}
      <Text size="xl" weight="bold" color={colors.text} style={styles.title}>
        {t('onboarding.locationStep.title')}
      </Text>

      {/* Subtitle */}
      <Text size="sm" color={colors.textSecondary} style={styles.subtitle}>
        {t('onboarding.locationStep.subtitle')}
      </Text>

      {/* Pre-populated Postal Code Display with Edit */}
      {(displayPostalCode || isEditingPostalCode) && (
        <View
          style={[
            styles.postalCodeBadge,
            { backgroundColor: isDark ? darkTheme.card : lightTheme.backgroundSecondary },
          ]}
        >
          {isEditingPostalCode ? (
            <View style={styles.postalCodeEditContainer}>
              <Text
                size="sm"
                weight="semibold"
                color={colors.text}
                style={styles.postalCodeEditLabel}
              >
                {t('onboarding.locationStep.postalCode')}
              </Text>
              <View style={styles.postalCodeEditRow}>
                <BottomSheetTextInput
                  style={[
                    styles.postalCodeEditInput,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                      color: colors.text,
                    },
                  ]}
                  value={editedPostalCode}
                  onChangeText={handlePostalCodeChange}
                  placeholder={t('onboarding.locationStep.postalCodePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={7}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.postalCodeActionButton, { backgroundColor: colors.buttonActive }]}
                  onPress={handleSavePostalCode}
                >
                  <Ionicons name="checkmark" size={18} color={colors.buttonTextActive} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.postalCodeActionButton,
                    {
                      backgroundColor: colors.inputBackground,
                      borderWidth: 1,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                  onPress={handleCancelEditPostalCode}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {postalCodeError && (
                <View style={styles.postalCodeErrorContainer}>
                  <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
                  <Text size="xs" color={colors.error} style={styles.postalCodeErrorText}>
                    {postalCodeError}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.postalCodeBadgeContent}>
              <Ionicons name="checkmark-circle" size={20} color={colors.buttonActive} />
              <View style={styles.postalCodeTextContainer}>
                <Text size="sm" weight="semibold" color={colors.text}>
                  {t('onboarding.locationStep.savedPostalCode')}
                </Text>
                <Text size="lg" weight="bold" color={colors.buttonActive}>
                  {displayPostalCode}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.postalCodeEditButton}
                onPress={handleStartEditPostalCode}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="pencil" size={16} color={colors.buttonActive} />
                <Text size="xs" weight="medium" color={colors.buttonActive}>
                  {t('onboarding.locationStep.editPostalCode')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Optional Address Field with Autocomplete */}
      <View style={styles.inputContainer}>
        <Text size="sm" weight="medium" color={colors.textSecondary} style={styles.inputLabel}>
          {t('onboarding.locationStep.address')}
          <Text size="xs" color={colors.textMuted}>
            {' '}
            ({t('common.optional')})
          </Text>
        </Text>
        <Text size="xs" color={colors.textMuted} style={styles.addressHint}>
          {t('onboarding.locationStep.addressHint')}
        </Text>
        <View style={styles.addressInputWrapper}>
          <BottomSheetTextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.text,
              },
            ]}
            placeholder={t('onboarding.locationStep.addressPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={addressQuery}
            onChangeText={handleAddressChange}
            onFocus={() => setShowSuggestions(true)}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {isLoadingPredictions && (
            <ActivityIndicator
              style={styles.loadingIndicator}
              size="small"
              color={colors.buttonActive}
            />
          )}
        </View>

        {/* Address Suggestions Dropdown */}
        {showSuggestions && predictions.length > 0 && (
          <View
            style={[
              styles.suggestionsContainer,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
          >
            {predictions.map(item => (
              <React.Fragment key={item.placeId}>{renderPrediction({ item })}</React.Fragment>
            ))}
          </View>
        )}
      </View>

      {/* Privacy Info Box */}
      <View
        style={[styles.infoBox, { backgroundColor: isDark ? darkTheme.card : lightTheme.muted }]}
      >
        <Ionicons name="shield-checkmark" size={24} color={colors.buttonActive} />
        <View style={styles.infoTextContainer}>
          <Text size="sm" weight="semibold" color={colors.text} style={styles.infoTitle}>
            {t('onboarding.locationStep.privacyTitle')}
          </Text>
          <Text size="xs" color={colors.textSecondary} style={styles.infoText}>
            {t('onboarding.locationStep.privacyDescription')}
          </Text>
        </View>
      </View>
    </BottomSheetScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacingPixels[4],
    paddingBottom: spacingPixels[8],
    flexGrow: 1,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacingPixels[2],
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacingPixels[6],
  },
  postalCodeBadge: {
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    marginBottom: spacingPixels[5],
  },
  postalCodeBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[3],
  },
  postalCodeTextContainer: {
    flex: 1,
  },
  postalCodeEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[1],
    paddingVertical: spacingPixels[1],
  },
  postalCodeEditContainer: {
    gap: spacingPixels[2],
  },
  postalCodeEditLabel: {
    marginBottom: spacingPixels[1],
  },
  postalCodeEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2],
  },
  postalCodeErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacingPixels[1],
    gap: spacingPixels[1],
  },
  postalCodeErrorText: {
    flex: 1,
  },
  postalCodeEditInput: {
    flex: 1,
    borderRadius: radiusPixels.md,
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[2],
    fontSize: 16,
    fontWeight: '600' as const,
    borderWidth: 1,
  },
  postalCodeActionButton: {
    width: 36,
    height: 36,
    borderRadius: radiusPixels.md,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  inputContainer: {
    marginBottom: spacingPixels[4],
    zIndex: 1,
  },
  inputLabel: {
    marginBottom: spacingPixels[1],
  },
  addressHint: {
    marginBottom: spacingPixels[2],
    lineHeight: 16,
  },
  addressInputWrapper: {
    position: 'relative',
  },
  input: {
    borderRadius: radiusPixels.lg,
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    fontSize: 16,
    borderWidth: 1,
  },
  loadingIndicator: {
    position: 'absolute',
    right: spacingPixels[3],
    top: '50%',
    marginTop: -10,
  },
  suggestionsContainer: {
    marginTop: spacingPixels[1],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[3],
    borderBottomWidth: 1,
    gap: spacingPixels[3],
  },
  suggestionTextContainer: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    marginTop: spacingPixels[4],
    gap: spacingPixels[3],
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    marginBottom: spacingPixels[1],
  },
  infoText: {
    lineHeight: 18,
  },
});

export default LocationStep;
