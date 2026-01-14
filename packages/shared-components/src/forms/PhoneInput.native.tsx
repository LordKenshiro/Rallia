/**
 * PhoneInput Component
 *
 * Phone number input with country code selector.
 * Shows a dropdown to select country (with flag and dial code),
 * and an input field for the local phone number.
 *
 * @example
 * ```tsx
 * <PhoneInput
 *   value="+14155551234"
 *   onChangePhone={(fullNumber, countryCode, localNumber) => {
 *     setPhone(fullNumber);
 *   }}
 *   label="Phone Number"
 *   required
 * />
 * ```
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ViewStyle,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../foundation/Text.native';
import { colors as themeColors } from '../theme';
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  Country,
  getCountryByCode,
  parsePhoneNumber,
  formatFullPhoneNumber,
} from '@rallia/shared-constants';

export interface PhoneInputProps {
  /**
   * Full phone number with country code (e.g., "+14155551234")
   */
  value?: string;

  /**
   * Callback when phone number changes
   * @param fullNumber - Complete phone number with country code
   * @param countryCode - ISO country code (e.g., "US")
   * @param localNumber - Local phone number without country code
   */
  onChangePhone: (
    fullNumber: string,
    countryCode: string,
    localNumber: string
  ) => void;

  /**
   * Input label
   */
  label?: string;

  /**
   * Placeholder text for the number input
   */
  placeholder?: string;

  /**
   * Whether the field is required
   */
  required?: boolean;

  /**
   * Error message
   */
  error?: string;

  /**
   * Whether the input is disabled
   */
  disabled?: boolean;

  /**
   * Default country code (ISO 3166-1 alpha-2). Defaults to 'CA' (Canada).
   */
  defaultCountryCode?: string;

  /**
   * Maximum length for local phone number
   */
  maxLength?: number;

  /**
   * Custom container style
   */
  containerStyle?: ViewStyle;

  /**
   * Custom input style
   */
  inputStyle?: ViewStyle;

  /**
   * Theme colors override
   */
  colors?: {
    text?: string;
    textMuted?: string;
    textSecondary?: string;
    background?: string;
    inputBackground?: string;
    inputBorder?: string;
    primary?: string;
    error?: string;
    card?: string;
  };

  /**
   * Callback when input is focused
   */
  onFocus?: () => void;

  /**
   * Callback when input loses focus
   */
  onBlur?: () => void;

  /**
   * Whether to show character count
   */
  showCharCount?: boolean;

  /**
   * Search placeholder text
   */
  searchPlaceholder?: string;

  /**
   * TextInput component override (for BottomSheet compatibility)
   */
  TextInputComponent?: React.ComponentType<React.ComponentProps<typeof TextInput>>;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value = '',
  onChangePhone,
  label,
  placeholder = 'Enter phone number',
  required = false,
  error,
  disabled = false,
  defaultCountryCode = 'CA',
  maxLength = 15,
  containerStyle,
  inputStyle,
  colors,
  onFocus,
  onBlur,
  showCharCount = false,
  searchPlaceholder = 'Search for countries',
  TextInputComponent = TextInput,
}) => {
  // Parse initial value to get country and local number
  const parsed = useMemo(() => {
    if (value) {
      return parsePhoneNumber(value);
    }
    return {
      country: getCountryByCode(defaultCountryCode) || DEFAULT_COUNTRY,
      localNumber: '',
    };
  }, [value, defaultCountryCode]);

  const [selectedCountry, setSelectedCountry] = useState<Country>(
    parsed.country || getCountryByCode(defaultCountryCode) || DEFAULT_COUNTRY
  );
  const [localNumber, setLocalNumber] = useState(parsed.localNumber);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Update local state when value prop changes externally
  useEffect(() => {
    if (value) {
      const { country, localNumber: parsedLocal } = parsePhoneNumber(value);
      if (country) {
        setSelectedCountry(country);
      }
      setLocalNumber(parsedLocal);
    }
  }, [value]);

  // Merge theme colors with custom colors
  const mergedColors = useMemo(
    () => ({
      text: colors?.text || themeColors.dark,
      textMuted: colors?.textMuted || themeColors.gray,
      textSecondary: colors?.textSecondary || themeColors.darkGray,
      background: colors?.background || themeColors.background,
      inputBackground: colors?.inputBackground || themeColors.veryLightGray,
      inputBorder: colors?.inputBorder || themeColors.lightGray,
      primary: colors?.primary || themeColors.primary,
      error: colors?.error || themeColors.error,
      card: colors?.card || themeColors.white,
    }),
    [colors]
  );

  // Filter countries based on search query
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) {
      return COUNTRIES;
    }
    const query = searchQuery.toLowerCase();
    return COUNTRIES.filter(
      country =>
        country.name.toLowerCase().includes(query) ||
        country.dialCode.includes(query) ||
        country.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Handle local number change
  const handleLocalNumberChange = useCallback(
    (text: string) => {
      // Only allow digits
      const cleaned = text.replace(/\D/g, '');
      setLocalNumber(cleaned);

      const fullNumber = formatFullPhoneNumber(selectedCountry.dialCode, cleaned);
      onChangePhone(fullNumber, selectedCountry.code, cleaned);
    },
    [selectedCountry, onChangePhone]
  );

  // Handle country selection
  const handleCountrySelect = useCallback(
    (country: Country) => {
      setSelectedCountry(country);
      setModalVisible(false);
      setSearchQuery('');

      const fullNumber = formatFullPhoneNumber(country.dialCode, localNumber);
      onChangePhone(fullNumber, country.code, localNumber);

      // Focus the input after selecting country
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    },
    [localNumber, onChangePhone]
  );

  // Open country selector modal
  const openCountrySelector = useCallback(() => {
    if (!disabled) {
      Keyboard.dismiss();
      setModalVisible(true);
    }
  }, [disabled]);

  // Render country item in the list
  const renderCountryItem = useCallback(
    ({ item }: { item: Country }) => {
      const isSelected = item.code === selectedCountry.code;
      return (
        <TouchableOpacity
          style={[
            styles.countryItem,
            isSelected && { backgroundColor: `${mergedColors.primary}15` },
          ]}
          onPress={() => handleCountrySelect(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.countryFlag}>{item.flag}</Text>
          <View style={styles.countryInfo}>
            <Text style={[styles.countryName, { color: mergedColors.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.countryDialCode, { color: mergedColors.textMuted }]}>
              ({item.dialCode})
            </Text>
          </View>
          {isSelected && (
            <Ionicons name="checkmark" size={20} color={mergedColors.primary} />
          )}
        </TouchableOpacity>
      );
    },
    [selectedCountry, mergedColors, handleCountrySelect]
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <Text style={[styles.label, { color: mergedColors.text }]}>
          {label}
          {required && (
            <Text style={{ color: mergedColors.error }}> *</Text>
          )}
        </Text>
      )}

      {/* Input Row */}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: mergedColors.inputBackground,
            borderColor: error ? mergedColors.error : mergedColors.inputBorder,
          },
          disabled && styles.disabled,
        ]}
      >
        {/* Country Selector Button */}
        <TouchableOpacity
          style={styles.countrySelector}
          onPress={openCountrySelector}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={styles.flag}>{selectedCountry.flag}</Text>
          <Text style={[styles.dialCode, { color: mergedColors.text }]}>
            {selectedCountry.dialCode}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={mergedColors.textMuted}
            style={styles.chevron}
          />
        </TouchableOpacity>

        {/* Separator */}
        <View
          style={[styles.separator, { backgroundColor: mergedColors.inputBorder }]}
        />

        {/* Phone Number Input */}
        {TextInputComponent === TextInput ? (
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { color: mergedColors.text },
              inputStyle,
            ]}
            value={localNumber}
            onChangeText={handleLocalNumberChange}
            placeholder={placeholder}
            placeholderTextColor={mergedColors.textMuted}
            keyboardType="phone-pad"
            maxLength={maxLength}
            editable={!disabled}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        ) : (
          <TextInputComponent
            style={[
              styles.input,
              { color: mergedColors.text },
              inputStyle,
            ]}
            value={localNumber}
            onChangeText={handleLocalNumberChange}
            placeholder={placeholder}
            placeholderTextColor={mergedColors.textMuted}
            keyboardType="phone-pad"
            maxLength={maxLength}
            editable={!disabled}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        )}
      </View>

      {/* Footer: Error or Character Count */}
      <View style={styles.footer}>
        {error ? (
          <Text style={[styles.errorText, { color: mergedColors.error }]}>
            {error}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {showCharCount && (
          <Text style={[styles.charCount, { color: mergedColors.textSecondary }]}>
            {localNumber.length}/{maxLength}
          </Text>
        )}
      </View>

      {/* Country Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: mergedColors.card }]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: mergedColors.text }]}>
                Select Country
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={mergedColors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: mergedColors.inputBackground,
                  borderColor: mergedColors.inputBorder,
                },
              ]}
            >
              <Ionicons
                name="search"
                size={20}
                color={mergedColors.textMuted}
                style={styles.searchIcon}
              />
              <TextInput
                style={[styles.searchInput, { color: mergedColors.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={mergedColors.textMuted}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={mergedColors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Countries List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={item => item.code}
              renderItem={renderCountryItem}
              style={styles.countryList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              initialNumToRender={20}
              maxToRenderPerBatch={20}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.5,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    minWidth: 100,
  },
  flag: {
    fontSize: 20,
    marginRight: 4,
  },
  dialCode: {
    fontSize: 14,
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 4,
  },
  separator: {
    width: 1,
    height: '60%',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    minHeight: 16,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
  },
  charCount: {
    fontSize: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  countryList: {
    flex: 1,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 16,
  },
  countryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryName: {
    fontSize: 16,
    marginRight: 8,
  },
  countryDialCode: {
    fontSize: 14,
  },
});

export default PhoneInput;
