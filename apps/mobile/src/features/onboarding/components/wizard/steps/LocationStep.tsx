/**
 * LocationStep Component
 *
 * Second step of onboarding - collects location information (address, city, postal code).
 * Uses Google Places Autocomplete for address suggestions.
 * City is mandatory, address and postal code are optional.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Keyboard,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { usePlacesAutocomplete } from '@rallia/shared-hooks';
import { lightHaptic, selectionHaptic } from '@rallia/shared-utils';
import type { TranslationKey } from '@rallia/shared-translations';
import type { PlacePrediction } from '@rallia/shared-types';
import type { OnboardingFormData } from '../../../hooks/useOnboardingWizard';

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
  const [addressQuery, setAddressQuery] = useState(formData.address || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

    const keyboardShowListener = Keyboard.addListener(showEvent, (e) => {
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

  // Handle address input change
  const handleAddressChange = (text: string) => {
    setAddressQuery(text);
    setShowSuggestions(true);
    onUpdateFormData({ address: text });
  };

  // Handle selecting a place from suggestions
  const handleSelectPlace = useCallback(async (prediction: PlacePrediction) => {
    selectionHaptic();
    setShowSuggestions(false);
    clearPredictions();

    // Set the address immediately
    const fullAddress = prediction.address 
      ? `${prediction.name}, ${prediction.address}` 
      : prediction.name;
    setAddressQuery(fullAddress);
    onUpdateFormData({ address: fullAddress });

    // Fetch place details to get coordinates and parse city/postal code
    try {
      const details = await getPlaceDetails(prediction.placeId);
      if (details) {
        onUpdateFormData({
          address: details.address,
          latitude: details.latitude,
          longitude: details.longitude,
        });
        setAddressQuery(details.address);

        // Try to extract city and postal code from the address
        // Format is usually: "Street, City, Province PostalCode, Country"
        const addressParts = details.address.split(',').map(part => part.trim());
        if (addressParts.length >= 2) {
          // City is usually the second-to-last part (before country)
          // For Canadian addresses: "123 Main St, Montreal, QC H1A 1A1, Canada"
          const cityPart = addressParts.length >= 3 ? addressParts[addressParts.length - 3] : addressParts[0];
          
          // Postal code is usually in the second-to-last part with province
          const provincePostalPart = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : '';
          const postalMatch = provincePostalPart.match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d|^\d{5}(-\d{4})?$/i);
          
          if (cityPart && !formData.city) {
            onUpdateFormData({ city: cityPart });
          }
          if (postalMatch && !formData.postalCode) {
            onUpdateFormData({ postalCode: postalMatch[0] });
          }
        }
      }
    } catch (error) {
      console.error('Failed to get place details:', error);
    }
  }, [clearPredictions, getPlaceDetails, onUpdateFormData, formData.city, formData.postalCode]);

  // Handle city input change
  const handleCityChange = (text: string) => {
    onUpdateFormData({ city: text });
  };

  // Handle postal code input change
  const handlePostalCodeChange = (text: string) => {
    // Format Canadian postal code (A1A 1A1) or US zip code
    const formatted = text.toUpperCase().replace(/[^A-Z0-9\s-]/g, '');
    onUpdateFormData({ postalCode: formatted });
  };

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
        { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : spacingPixels[8] }
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {/* Title */}
      <Text size="xl" weight="bold" color={colors.text} style={styles.title}>
        {t('onboarding.locationStep.title' as TranslationKey)}
      </Text>

      {/* Subtitle */}
      <Text size="sm" color={colors.textSecondary} style={styles.subtitle}>
        {t('onboarding.locationStep.subtitle' as TranslationKey)}
      </Text>

      {/* Address Field with Autocomplete */}
      <View style={styles.inputContainer}>
        <Text size="sm" weight="medium" color={colors.textSecondary} style={styles.inputLabel}>
          {t('onboarding.locationStep.address' as TranslationKey)}
          <Text size="xs" color={colors.textMuted}> ({t('common.optional' as TranslationKey)})</Text>
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
            placeholder={t('onboarding.locationStep.addressPlaceholder' as TranslationKey)}
            placeholderTextColor={colors.textMuted}
            value={addressQuery}
            onChangeText={handleAddressChange}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Delay hiding suggestions to allow tap on suggestion
              setTimeout(() => setShowSuggestions(false), 200);
            }}
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
            <FlatList
              data={predictions}
              keyExtractor={(item) => item.placeId}
              renderItem={renderPrediction}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={false}
            />
          </View>
        )}
      </View>

      {/* City Field (Mandatory) */}
      <View style={styles.inputContainer}>
        <Text size="sm" weight="medium" color={colors.textSecondary} style={styles.inputLabel}>
          {t('onboarding.locationStep.city' as TranslationKey)}
          <Text size="xs" color={colors.error}> *</Text>
        </Text>
        <BottomSheetTextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBackground,
              borderColor: !formData.city.trim() ? colors.error : colors.inputBorder,
              color: colors.text,
            },
          ]}
          placeholder={t('onboarding.locationStep.cityPlaceholder' as TranslationKey)}
          placeholderTextColor={colors.textMuted}
          value={formData.city}
          onChangeText={handleCityChange}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      {/* Postal Code Field */}
      <View style={styles.inputContainer}>
        <Text size="sm" weight="medium" color={colors.textSecondary} style={styles.inputLabel}>
          {t('onboarding.locationStep.postalCode' as TranslationKey)}
          <Text size="xs" color={colors.textMuted}> ({t('common.optional' as TranslationKey)})</Text>
        </Text>
        <BottomSheetTextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.text,
            },
          ]}
          placeholder={t('onboarding.locationStep.postalCodePlaceholder' as TranslationKey)}
          placeholderTextColor={colors.textMuted}
          value={formData.postalCode}
          onChangeText={handlePostalCodeChange}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={10}
        />
      </View>

      {/* Privacy Info Box */}
      <View style={[styles.infoBox, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
        <Ionicons name="shield-checkmark" size={24} color={colors.buttonActive} />
        <View style={styles.infoTextContainer}>
          <Text size="sm" weight="semibold" color={colors.text} style={styles.infoTitle}>
            {t('onboarding.locationStep.privacyTitle' as TranslationKey)}
          </Text>
          <Text size="xs" color={colors.textSecondary} style={styles.infoText}>
            {t('onboarding.locationStep.privacyDescription' as TranslationKey)}
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
  inputContainer: {
    marginBottom: spacingPixels[4],
    zIndex: 1,
  },
  inputLabel: {
    marginBottom: spacingPixels[2],
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
