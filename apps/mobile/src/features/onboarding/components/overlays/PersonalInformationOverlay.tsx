import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  Modal,
  Animated,
  Alert,
  TextInput,
  ToastAndroid,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Overlay, Select, Button, Heading, Text, PhoneInput } from '@rallia/shared-components';
import { useImagePicker, useThemeStyles, useTranslation } from '../../../../hooks';
import type { TranslationKey } from '@rallia/shared-translations';
import { COLORS } from '@rallia/shared-constants';
import {
  validateFullName,
  validateUsername,
  lightHaptic,
  mediumHaptic,
} from '@rallia/shared-utils';
import { OnboardingService, supabase, Logger } from '@rallia/shared-services';
import { uploadImage, replaceImage } from '../../../../services/imageUpload';
import type { GenderEnum, GenderType } from '@rallia/shared-types';
import ProgressIndicator from '../ProgressIndicator';

interface PersonalInformationOverlayProps {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
  onContinue?: () => void;
  onSave?: () => void; // Called only when data is successfully saved (edit mode)
  currentStep?: number;
  totalSteps?: number;
  mode?: 'onboarding' | 'edit'; // New prop to distinguish context
  initialData?: {
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    dateOfBirth?: string;
    gender?: string;
    phoneNumber?: string;
    profilePictureUrl?: string; // Used in edit mode to delete old image when replacing
  };
}

const PersonalInformationOverlay: React.FC<PersonalInformationOverlayProps> = ({
  visible,
  onClose,
  onBack,
  onContinue,
  onSave,
  currentStep = 1,
  totalSteps = 8,
  mode = 'onboarding', // Default to onboarding mode
  initialData,
}) => {
  const { colors } = useThemeStyles();
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState(initialData?.firstName || '');
  const [lastName, setLastName] = useState(initialData?.lastName || '');
  const [username, setUsername] = useState(initialData?.username || '');
  const [email] = useState(initialData?.email || ''); // Email is read-only in edit mode
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(
    initialData?.dateOfBirth ? new Date(initialData.dateOfBirth) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState(initialData?.gender || '');
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || '');

  // Dynamic gender options from database
  const [genderOptions, setGenderOptions] = useState<Array<{ value: string; label: string }>>([]);

  // Use custom hook for image picker
  const { image: profileImage, pickImage } = useImagePicker();

  // Track saving state
  const [isSaving, setIsSaving] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Fetch gender options from database
  useEffect(() => {
    const fetchGenderOptions = async () => {
      try {
        const { data, error } = await OnboardingService.getGenderTypes();

        if (error) {
          Logger.error('Failed to fetch gender types from database', error as Error);
          // Use fallback if API fails
          setGenderOptions([
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
            //{ value: 'prefer_not_to_say', label: 'Prefer not to say' },
          ]);
        } else if (data) {
          setGenderOptions(data);
        }
      } catch (error) {
        Logger.error('Unexpected error fetching gender types', error as Error);
        // Use fallback on error
        setGenderOptions([
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'other', label: 'Other' },
          //{ value: 'prefer_not_to_say', label: 'Prefer not to say' },
        ]);
      }
    };

    if (visible) {
      fetchGenderOptions();
    }
  }, [visible]);

  // Trigger animations when overlay becomes visible
  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  // Validation handlers using utility functions
  const handleFirstNameChange = (text: string) => {
    setFirstName(validateFullName(text));
  };

  const handleLastNameChange = (text: string) => {
    setLastName(validateFullName(text));
  };

  const handleUsernameChange = (text: string) => {
    setUsername(validateUsername(text));
  };

  const handlePhoneNumberChange = useCallback(
    (fullNumber: string, _countryCode: string, _localNumber: string) => {
      setPhoneNumber(fullNumber);
    },
    []
  );

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setDateOfBirth(selectedDate);
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handleContinue = async () => {
    if (isSaving) return;

    mediumHaptic();

    if (!dateOfBirth) {
      Alert.alert(t('alerts.error' as TranslationKey), t('onboarding.validation.selectDateOfBirth' as TranslationKey));
      return;
    }

    try {
      // Gender is now stored as the enum value (e.g., 'male', 'female')
      if (!gender) {
        Alert.alert(t('alerts.error' as TranslationKey), t('onboarding.validation.selectGender' as TranslationKey));
        return;
      }

      setIsSaving(true);

      // Format date to YYYY-MM-DD for database
      const formattedDate = dateOfBirth.toISOString().split('T')[0];

      // Upload profile picture if a new one was selected
      let uploadedImageUrl: string | null = null;
      if (profileImage) {
        // In edit mode, use replaceImage to delete the old image
        // In onboarding mode, use uploadImage (no old image to delete)
        const oldImageUrl = mode === 'edit' ? initialData?.profilePictureUrl : undefined;
        const { url, error: uploadError } = oldImageUrl
          ? await replaceImage(profileImage, oldImageUrl, 'profile-pictures')
          : await uploadImage(profileImage, 'profile-pictures');

        if (uploadError) {
          Logger.error('Failed to upload profile picture', uploadError as Error);
          setIsSaving(false);
          Alert.alert(
            t('onboarding.validation.uploadError' as TranslationKey),
            t('onboarding.validation.failedToUploadPicture' as TranslationKey),
            [
              {
                text: t('common.cancel' as TranslationKey),
                style: 'cancel',
                onPress: () => {
                  return;
                },
              },
              {
                text: t('common.continue' as TranslationKey),
                onPress: () => {
                  uploadedImageUrl = null;
                },
              },
            ]
          );
          return; // Stop here to let user decide
        } else {
          uploadedImageUrl = url;
        }
      }

      if (mode === 'edit') {
        // Edit mode: Update existing profile data
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsSaving(false);
          Alert.alert(t('alerts.error' as TranslationKey), t('onboarding.validation.playerNotFound' as TranslationKey));
          return;
        }

        const updateData: {
          first_name: string;
          last_name: string;
          display_name: string;
          birth_date: string;
          phone: string;
          updated_at: string;
          profile_picture_url?: string;
        } = {
          first_name: firstName,
          last_name: lastName,
          display_name: username,
          birth_date: formattedDate,
          phone: phoneNumber,
          updated_at: new Date().toISOString(),
        };

        // Only update profile picture if a new one was uploaded
        if (uploadedImageUrl) {
          updateData.profile_picture_url = uploadedImageUrl;
        }

        const { error: updateError } = await supabase
          .from('profile')
          .update(updateData)
          .eq('id', user.id);

        if (updateError) {
          Logger.error('Failed to update profile', updateError as Error, { userId: user.id });
          setIsSaving(false);
          Alert.alert(t('alerts.error' as TranslationKey), t('onboarding.validation.failedToUpdateProfile' as TranslationKey));
          return;
        }

        // Update player table gender
        const { error: playerUpdateError } = await supabase
          .from('player')
          .update({
            gender: gender as GenderType,
          })
          .eq('id', user.id);

        if (playerUpdateError) {
          Logger.error('Failed to update player gender', playerUpdateError as Error, {
            userId: user.id,
          });
        }

        // Sync display_name to auth.users metadata (phone is already in profile table)
        const { error: authUpdateError } = await supabase.auth.updateUser({
          data: { display_name: username },
        });

        if (authUpdateError) {
          Logger.warn('Failed to sync display_name to auth.users', {
            error: authUpdateError.message,
            userId: user.id,
          });
          // Don't block the save - profile table is already updated
        }

        // Show success toast
        if (Platform.OS === 'android') {
          ToastAndroid.show(t('onboarding.successMessages.personalInfoUpdated' as TranslationKey), ToastAndroid.LONG);
        } else {
          // For iOS, use a brief Alert that auto-dismisses via timeout
          Alert.alert(t('alerts.success' as TranslationKey), t('onboarding.successMessages.personalInfoUpdated' as TranslationKey));
        }

        // Notify parent that data was saved successfully
        onSave?.();

        // Close modal automatically after brief delay
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        // Onboarding mode: Save new personal information
        const { error } = await OnboardingService.savePersonalInfo({
          first_name: firstName,
          last_name: lastName,
          display_name: username,
          birth_date: formattedDate,
          gender: gender as GenderEnum,
          phone: phoneNumber,
          profile_picture_url: uploadedImageUrl || undefined,
        });

        if (error) {
          Logger.error('Failed to save personal info during onboarding', error as Error, {
            hasProfileImage: !!uploadedImageUrl,
          });
          Alert.alert(t('alerts.error' as TranslationKey), t('onboarding.validation.failedToSaveInfo' as TranslationKey), [
            { text: t('common.ok' as TranslationKey) },
          ]);
          return;
        }

        // Sync username (display name) to auth.users metadata
        // Note: Phone is stored in profile table, not auth.users (requires verification)
        Logger.debug('Syncing username to auth.users', { username });
        const { error: authUpdateError } = await supabase.auth.updateUser({
          data: {
            display_name: username, // Sync username to display_name in user_metadata
          },
        });

        if (authUpdateError) {
          Logger.warn('Failed to sync username to auth.users', {
            error: authUpdateError.message,
          });
          // Don't block onboarding if this fails - data is already saved to profile table
        } else {
          Logger.debug('Username synced to auth.users successfully', { username });
        }

        Logger.info('Personal info saved successfully during onboarding', {
          hasFirstName: !!firstName,
          hasLastName: !!lastName,
          hasUsername: !!username,
          hasGender: !!gender,
          hasPhone: !!phoneNumber,
          hasProfileImage: !!profileImage,
        });

        if (onContinue) {
          onContinue();
        }
      }
    } catch (error) {
      Logger.error('Unexpected error saving personal info', error as Error, { mode });
      Alert.alert(t('alerts.error' as TranslationKey), t('onboarding.validation.unexpectedError' as TranslationKey), [{ text: t('common.ok' as TranslationKey) }]);
    }
  };

  const isFormValid =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    username.trim() !== '' &&
    dateOfBirth !== null &&
    gender.trim() !== '' &&
    phoneNumber.trim() !== '';

  return (
    <Overlay
      visible={visible}
      onClose={onClose}
      onBack={onBack}
      type="bottom"
      showBackButton={false}
    >
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Progress Indicator - Only show in onboarding mode */}
        {mode === 'onboarding' && (
          <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />
        )}

        {/* Title */}
        <Heading level={2} style={[styles.title, { color: colors.text }]}>
          {mode === 'onboarding' ? 'Tell us about yourself' : 'Update your personal information'}
        </Heading>

        {/* Profile Picture Upload - Only show in onboarding mode */}
        {mode === 'onboarding' && (
          <TouchableOpacity
            style={[
              styles.profilePicContainer,
              { borderColor: colors.primary, backgroundColor: colors.inputBackground },
            ]}
            activeOpacity={0.8}
            onPress={() => {
              lightHaptic();
              pickImage();
            }}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <Ionicons name="camera" size={32} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}

        {/* First Name Input */}
        <View style={styles.customInputContainer}>
          <Text style={[styles.customInputLabel, { color: colors.text }]}>
            First Name <Text style={[styles.requiredStar, { color: colors.error }]}>*</Text>
          </Text>
          <TextInput
            placeholder="Enter your first name"
            placeholderTextColor={colors.textMuted}
            value={firstName}
            onChangeText={handleFirstNameChange}
            style={[
              styles.inputWithIcon,
              styles.inputField,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBackground,
                color: colors.text,
              },
            ]}
          />
        </View>

        {/* Last Name Input */}
        <View style={styles.customInputContainer}>
          <Text style={[styles.customInputLabel, { color: colors.text }]}>
            Last Name <Text style={[styles.requiredStar, { color: colors.error }]}>*</Text>
          </Text>
          <TextInput
            placeholder="Enter your last name"
            placeholderTextColor={colors.textMuted}
            value={lastName}
            onChangeText={handleLastNameChange}
            style={[
              styles.inputWithIcon,
              styles.inputField,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBackground,
                color: colors.text,
              },
            ]}
          />
        </View>

        {/* Email Input - Only show in edit mode, read-only */}
        {mode === 'edit' && (
          <View style={styles.customInputContainer}>
            <Text style={[styles.customInputLabel, { color: colors.text }]}>
              Email <Text style={[styles.requiredStar, { color: colors.error }]}>*</Text>
            </Text>
            <TextInput
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={() => {}} // Read-only, no-op
              editable={false}
              style={[
                styles.inputWithIcon,
                styles.inputField,
                styles.customInputDisabled,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBackground,
                  color: colors.text,
                },
              ]}
            />
            <Text style={[styles.customHelperText, { color: colors.textMuted }]}>
              This information cannot be modified
            </Text>
          </View>
        )}

        {/* Username Input - Light green background for both modes */}
        <View style={styles.customInputContainer}>
          <Text style={[styles.customInputLabel, { color: colors.text }]}>
            Username <Text style={[styles.requiredStar, { color: colors.error }]}>*</Text>
          </Text>
          <TextInput
            placeholder="Choose a username"
            placeholderTextColor={colors.textMuted}
            value={username}
            onChangeText={handleUsernameChange}
            maxLength={10}
            style={[
              styles.inputWithIcon,
              styles.inputField,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBackground,
                color: colors.text,
              },
            ]}
          />
          <View style={styles.inputFooter}>
            <Text style={[styles.customHelperText, { color: colors.textMuted }]}>
              Max 10 characters, no spaces
            </Text>
            <Text style={[styles.charCount, { color: colors.textMuted }]}>
              {username.length}/10
            </Text>
          </View>
        </View>

        {/* Date of Birth Input - Light green background for both modes */}
        <Text style={[styles.customInputLabel, { color: colors.text }]}>
          Date of Birth <Text style={[styles.requiredStar, { color: colors.error }]}>*</Text>
        </Text>
        {Platform.OS === 'web' ? (
          <View
            style={[
              styles.inputWithIcon,
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBackground },
            ]}
          >
            <input
              type="date"
              style={{
                flex: 1,
                fontSize: 16,
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                color: colors.text,
                fontFamily: 'inherit',
              }}
              value={dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : ''}
              onChange={e => {
                const selectedDate = e.target.value ? new Date(e.target.value) : null;
                if (selectedDate) {
                  setDateOfBirth(selectedDate);
                }
              }}
              max={new Date().toISOString().split('T')[0]}
              min="1900-01-01"
              placeholder="Date of Birth"
            />
            <Ionicons
              name="calendar-outline"
              size={20}
              color={colors.textMuted}
              style={styles.inputIcon}
            />
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.inputWithIcon,
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBackground },
            ]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <Text color={dateOfBirth ? colors.text : colors.textMuted} style={{ flex: 1 }}>
              {dateOfBirth ? formatDate(dateOfBirth) : 'Date of Birth'}
            </Text>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={colors.textMuted}
              style={styles.inputIcon}
            />
          </TouchableOpacity>
        )}

        {/* Date Picker - iOS Modal */}
        {showDatePicker && Platform.OS === 'ios' && (
          <Modal
            transparent
            animationType="slide"
            visible={showDatePicker}
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.card }]}>
                <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={[styles.datePickerButton, { color: colors.primary }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={dateOfBirth || new Date(2000, 0, 1)}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  style={styles.datePicker}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Date Picker - Android */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={dateOfBirth || new Date(2000, 0, 1)}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
          />
        )}

        {/* Gender Picker - Light green background for both modes */}
        <View style={styles.customInputContainer}>
          <Text style={[styles.customInputLabel, { color: colors.text }]}>
            Gender <Text style={[styles.requiredStar, { color: colors.error }]}>*</Text>
          </Text>
          <Select
            placeholder="Select your gender"
            value={gender}
            onChange={setGender}
            options={genderOptions}
            containerStyle={styles.inlineInputContainer}
            selectStyle={[
              styles.genderSelectStyle,
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBackground },
            ]}
          />
        </View>

        {/* Phone Number Input - Light green background for both modes */}
        <View style={styles.customInputContainer}>
          <PhoneInput
            value={phoneNumber}
            onChangePhone={handlePhoneNumberChange}
            label="Phone Number"
            placeholder="Enter phone number"
            required
            maxLength={15}
            showCharCount
            colors={{
              text: colors.text,
              textMuted: colors.textMuted,
              textSecondary: colors.textSecondary,
              background: colors.background,
              inputBackground: colors.inputBackground,
              inputBorder: colors.inputBackground,
              primary: colors.primary,
              error: colors.error,
              card: colors.card,
            }}
          />
        </View>

        {/* Continue/Save Button */}
        <Button
          variant="primary"
          onPress={handleContinue}
          disabled={!isFormValid || isSaving}
          style={mode === 'edit' ? styles.saveButtonContainer : styles.continueButton}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : mode === 'onboarding' ? (
            'Continue'
          ) : (
            'Save'
          )}
        </Button>
      </Animated.View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingBottom: 30, // Extra padding at bottom to ensure content is scrollable
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20, // Reduced from 25 to save space
    lineHeight: 32,
  },
  profilePicContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 25,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  continueButton: {
    backgroundColor: COLORS.buttonPrimary,
    marginTop: 10,
  },
  saveButtonContainer: {
    marginTop: 10,
    backgroundColor: COLORS.accent, // Coral/pink color for Save button in edit mode
  },
  // Custom input styles for edit mode with light green background
  customInputContainer: {
    marginBottom: 12, // Reduced from 15 to save vertical space
  },
  customInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  requiredStar: {
    // Color applied inline
  },
  customInputDisabled: {
    opacity: 0.6,
  },
  inlineInputContainer: {
    marginBottom: 0, // Remove Select's default margin
  },
  genderSelectStyle: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 15,
    borderWidth: 1,
    minHeight: 50, // Match other input heights
  },
  customHelperText: {
    fontSize: 12,
    marginTop: 4,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
  },
  inputWithIcon: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 15,
    borderWidth: 1,
  },
  inputField: {
    fontSize: 16,
  },
  inputText: {
    paddingVertical: 0,
  },
  placeholderText: {
    // Unused style - placeholderTextColor is set inline
  },
  inputIcon: {
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  datePickerButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  datePicker: {
    width: '100%',
    height: 200,
  },
});

export default PersonalInformationOverlay;
