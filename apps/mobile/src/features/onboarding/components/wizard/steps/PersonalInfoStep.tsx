/**
 * PersonalInfoStep Component
 *
 * First step of onboarding - collects personal information.
 * Migrated from PersonalInformationOverlay with theme-aware colors.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  Image,
  Pressable,
  Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  BottomSheetTextInput,
  BottomSheetScrollView,
  type BottomSheetScrollViewMethods,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Text, PhoneInput } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import {
  validateFullName,
  validateUsername,
  lightHaptic,
  selectionHaptic,
} from '@rallia/shared-utils';
import { GENDER_VALUES } from '@rallia/shared-types';
import type { TranslationKey } from '@rallia/shared-translations';
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

interface PersonalInfoStepProps {
  formData: OnboardingFormData;
  onUpdateFormData: (updates: Partial<OnboardingFormData>) => void;
  onPickImage: () => void;
  colors: ThemeColors;
  t: (key: TranslationKey) => string;
  isDark: boolean;
}

export const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({
  formData,
  onUpdateFormData,
  onPickImage,
  colors,
  t,
  isDark,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(formData.dateOfBirth || new Date(2000, 0, 1));
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Refs for keyboard visibility handling
  const scrollViewRef = useRef<BottomSheetScrollViewMethods>(null);
  const firstNameFieldRef = useRef<View>(null);
  const lastNameFieldRef = useRef<View>(null);
  const usernameFieldRef = useRef<View>(null);
  const phoneNumberFieldRef = useRef<View>(null);
  // Y positions of each field within scroll content (from onLayout), used to scroll only enough to bring field into view
  const fieldYOffsets = useRef<Record<string, number>>({});
  const SCROLL_TO_FIELD_TOP_PADDING = 24;

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

  const handleFirstNameChange = (text: string) => {
    onUpdateFormData({ firstName: validateFullName(text) });
  };

  const handleLastNameChange = (text: string) => {
    onUpdateFormData({ lastName: validateFullName(text) });
  };

  const handleUsernameChange = (text: string) => {
    onUpdateFormData({ username: validateUsername(text) });
  };

  const handlePhoneNumberChange = useCallback(
    (fullNumber: string, _countryCode: string, _localNumber: string) => {
      onUpdateFormData({ phoneNumber: fullNumber });
    },
    [onUpdateFormData]
  );

  // Get the current date value for the picker
  const dateValue = formData.dateOfBirth || new Date(2000, 0, 1);

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        onUpdateFormData({ dateOfBirth: selectedDate });
      }
    } else if (selectedDate) {
      // iOS: just update temp value, commit on Done
      setTempDate(selectedDate);
    }
  };

  const handleDateDone = () => {
    onUpdateFormData({ dateOfBirth: tempDate });
    setShowDatePicker(false);
    lightHaptic();
  };

  const handleDateCancel = () => {
    setTempDate(dateValue);
    setShowDatePicker(false);
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const scrollToField = useCallback((fieldKey: string) => {
    const delay = Platform.OS === 'ios' ? 300 : 100;
    setTimeout(() => {
      const y = fieldYOffsets.current[fieldKey];
      if (y !== undefined && scrollViewRef.current) {
        const targetY = Math.max(0, y - SCROLL_TO_FIELD_TOP_PADDING);
        scrollViewRef.current.scrollTo({ y: targetY, animated: true });
      }
    }, delay);
  }, []);

  return (
    <BottomSheetScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : spacingPixels[8] },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {/* Title */}
      <Text size="xl" weight="bold" color={colors.text} style={styles.title}>
        {t('onboarding.personalInfoStep.title')}
      </Text>

      {/* Profile Picture */}
      <TouchableOpacity
        style={[styles.profilePicContainer, { borderColor: colors.buttonActive }]}
        activeOpacity={0.8}
        onPress={() => {
          lightHaptic();
          onPickImage();
        }}
      >
        {formData.profileImage ? (
          <Image source={{ uri: formData.profileImage }} style={styles.profileImage} />
        ) : (
          <Ionicons name="camera-outline" size={32} color={colors.buttonActive} />
        )}
      </TouchableOpacity>

      {/* First Name */}
      <View
        ref={firstNameFieldRef}
        style={styles.inputContainer}
        onLayout={e => {
          fieldYOffsets.current.firstName = e.nativeEvent.layout.y;
        }}
      >
        <Text size="sm" weight="semibold" color={colors.text} style={styles.inputLabel}>
          {t('onboarding.personalInfoStep.firstName')}{' '}
          <Text color={colors.error}>{t('onboarding.personalInfoStep.required')}</Text>
        </Text>
        <BottomSheetTextInput
          placeholder={t('onboarding.personalInfoStep.firstNamePlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={formData.firstName}
          onChangeText={handleFirstNameChange}
          onFocus={() => scrollToField('firstName')}
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.text,
            },
          ]}
        />
      </View>

      {/* Last Name */}
      <View
        ref={lastNameFieldRef}
        style={styles.inputContainer}
        onLayout={e => {
          fieldYOffsets.current.lastName = e.nativeEvent.layout.y;
        }}
      >
        <Text size="sm" weight="semibold" color={colors.text} style={styles.inputLabel}>
          {t('onboarding.personalInfoStep.lastName')}{' '}
          <Text color={colors.error}>{t('onboarding.personalInfoStep.required')}</Text>
        </Text>
        <BottomSheetTextInput
          placeholder={t('onboarding.personalInfoStep.lastNamePlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={formData.lastName}
          onChangeText={handleLastNameChange}
          onFocus={() => scrollToField('lastName')}
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.text,
            },
          ]}
        />
      </View>

      {/* Username */}
      <View
        ref={usernameFieldRef}
        style={styles.inputContainer}
        onLayout={e => {
          fieldYOffsets.current.username = e.nativeEvent.layout.y;
        }}
      >
        <Text size="sm" weight="semibold" color={colors.text} style={styles.inputLabel}>
          {t('onboarding.personalInfoStep.username')}{' '}
          <Text color={colors.error}>{t('onboarding.personalInfoStep.required')}</Text>
        </Text>
        <BottomSheetTextInput
          placeholder={t('onboarding.personalInfoStep.usernamePlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={formData.username}
          onChangeText={handleUsernameChange}
          maxLength={10}
          onFocus={() => scrollToField('username')}
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.text,
            },
          ]}
        />
        <View style={styles.inputFooter}>
          <Text size="xs" color={colors.textSecondary}>
            {t('onboarding.personalInfoStep.usernameHelper')}
          </Text>
          <Text size="xs" color={colors.textSecondary}>
            {formData.username.length}/10
          </Text>
        </View>
      </View>

      {/* Date of Birth */}
      <View style={styles.inputContainer}>
        <Text size="sm" weight="semibold" color={colors.text} style={styles.inputLabel}>
          {t('onboarding.personalInfoStep.dateOfBirth')}{' '}
          <Text color={colors.error}>{t('onboarding.personalInfoStep.required')}</Text>
        </Text>
        <TouchableOpacity
          style={[
            styles.input,
            styles.dateInput,
            { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
          ]}
          onPress={() => {
            lightHaptic();
            setTempDate(dateValue);
            setShowDatePicker(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.buttonActive} />
          <Text color={formData.dateOfBirth ? colors.text : colors.textMuted} style={{ flex: 1 }}>
            {formData.dateOfBirth ? formatDate(formData.dateOfBirth) : t('common.select')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* iOS Date Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={handleDateCancel}
        >
          <Pressable
            style={[
              styles.modalOverlay,
              { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)' },
            ]}
            onPress={handleDateCancel}
          >
            <View style={[styles.datePickerContainer, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={handleDateCancel} style={styles.pickerHeaderButton}>
                  <Text size="base" color={colors.textMuted}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <Text size="base" weight="semibold" color={colors.text}>
                  {t('onboarding.personalInfoStep.dateOfBirth')}
                </Text>
                <TouchableOpacity onPress={handleDateDone} style={styles.pickerHeaderButton}>
                  <Text size="base" weight="semibold" color={colors.buttonActive}>
                    {t('common.done')}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                themeVariant={isDark ? 'dark' : 'light'}
                style={styles.iosPicker}
              />
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Android Date Picker */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}

      {/* Gender - Full-width Options */}
      <View style={styles.inputContainer}>
        <Text size="sm" weight="semibold" color={colors.text} style={styles.inputLabel}>
          {t('onboarding.personalInfoStep.gender')}{' '}
          <Text color={colors.error}>{t('onboarding.personalInfoStep.required')}</Text>
        </Text>
        <View style={styles.genderRow}>
          {GENDER_VALUES.map(value => {
            const isSelected = formData.gender === value;
            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.genderOption,
                  {
                    backgroundColor: isSelected ? colors.buttonActive : colors.buttonInactive,
                    borderColor: isSelected ? colors.buttonActive : colors.border,
                  },
                ]}
                onPress={() => {
                  selectionHaptic();
                  onUpdateFormData({ gender: value });
                }}
                activeOpacity={0.7}
              >
                <Text
                  size="base"
                  weight={isSelected ? 'semibold' : 'regular'}
                  color={isSelected ? colors.buttonTextActive : colors.text}
                >
                  {t(`profile.genderValues.${value}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Phone Number */}
      <View
        ref={phoneNumberFieldRef}
        style={styles.inputContainer}
        onLayout={e => {
          fieldYOffsets.current.phoneNumber = e.nativeEvent.layout.y;
        }}
      >
        <PhoneInput
          value={formData.phoneNumber}
          onChangePhone={handlePhoneNumberChange}
          label={t('onboarding.personalInfoStep.phoneNumber')}
          placeholder={t('onboarding.personalInfoStep.phoneNumber')}
          required
          maxLength={15}
          showCharCount
          colors={{
            text: colors.text,
            textMuted: colors.textMuted,
            textSecondary: colors.textSecondary,
            background: colors.background,
            inputBackground: colors.inputBackground,
            inputBorder: colors.inputBorder,
            primary: colors.buttonActive,
            error: colors.error,
            card: colors.cardBackground,
          }}
          onFocus={() => scrollToField('phoneNumber')}
          TextInputComponent={BottomSheetTextInput}
        />
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
    marginBottom: spacingPixels[4],
  },
  profilePicContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacingPixels[6],
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  inputContainer: {
    marginBottom: spacingPixels[3],
  },
  inputLabel: {
    marginBottom: spacingPixels[2],
  },
  input: {
    borderRadius: radiusPixels.lg,
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    fontSize: 16,
    borderWidth: 1,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[3],
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacingPixels[1],
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacingPixels[2],
  },
  genderOption: {
    flex: 1,
    paddingVertical: spacingPixels[3],
    paddingHorizontal: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    borderTopLeftRadius: radiusPixels['2xl'],
    borderTopRightRadius: radiusPixels['2xl'],
    paddingBottom: spacingPixels[5],
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[4],
    borderBottomWidth: 1,
  },
  pickerHeaderButton: {
    paddingVertical: spacingPixels[2],
    paddingHorizontal: spacingPixels[2],
    minWidth: 60,
  },
  iosPicker: {
    height: 200,
  },
});

export default PersonalInfoStep;
