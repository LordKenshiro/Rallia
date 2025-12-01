import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  Modal,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  Overlay, 
  Input, 
  Select, 
  Button, 
  Heading, 
  Text 
} from '@rallia/shared-components';
import { useImagePicker } from '../../../../hooks';
import { COLORS } from '@rallia/shared-constants';
import { validateFullName, validateUsername, validatePhoneNumber } from '@rallia/shared-utils';
import { OnboardingService, supabase } from '@rallia/shared-services';
import type { GenderType } from '@rallia/shared-types';
import ProgressIndicator from '../ProgressIndicator';
import { lightHaptic, mediumHaptic } from '../../../../utils/haptics';

interface PersonalInformationOverlayProps {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
  onContinue?: () => void;
  currentStep?: number;
  totalSteps?: number;
}

const PersonalInformationOverlay: React.FC<PersonalInformationOverlayProps> = ({
  visible,
  onClose,
  onBack,
  onContinue,
  currentStep = 1,
  totalSteps = 8,
}) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Dynamic gender options from database
  const [genderOptions, setGenderOptions] = useState<Array<{ value: string; label: string }>>([]);

  // Use custom hook for image picker
  const { image: profileImage, pickImage } = useImagePicker();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Fetch gender options from database
  useEffect(() => {
    const fetchGenderOptions = async () => {
      try {
        const { data, error } = await OnboardingService.getGenderTypes();
        
        if (error) {
          console.error('Error fetching gender types:', error);
          // Use fallback if API fails
          setGenderOptions([
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Non-binary' },
            { value: 'prefer_not_to_say', label: 'Prefer not to say' },
          ]);
        } else if (data) {
          setGenderOptions(data);
        }
      } catch (error) {
        console.error('Unexpected error fetching genders:', error);
        // Use fallback on error
        setGenderOptions([
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'other', label: 'Non-binary' },
          { value: 'prefer_not_to_say', label: 'Prefer not to say' },
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
  const handleFullNameChange = (text: string) => {
    setFullName(validateFullName(text));
  };

  const handleUsernameChange = (text: string) => {
    setUsername(validateUsername(text));
  };

  const handlePhoneNumberChange = (text: string) => {
    setPhoneNumber(validatePhoneNumber(text));
  };

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
    mediumHaptic();
    
    if (!dateOfBirth) {
      Alert.alert('Error', 'Please select your date of birth');
      return;
    }
    
    try {
      // Gender is now stored as the enum value (e.g., 'male', 'female')
      if (!gender) {
        Alert.alert('Error', 'Please select a valid gender option');
        return;
      }
      
      // Format date to YYYY-MM-DD for database
      const formattedDate = dateOfBirth.toISOString().split('T')[0];
      
      // Save personal information to database
      const { error } = await OnboardingService.savePersonalInfo({
        full_name: fullName,
        display_name: username,
        birth_date: formattedDate,
        gender: gender as GenderType,
        phone: phoneNumber,
        profile_picture_url: profileImage || undefined,
      });
      
      if (error) {
        console.error('Error saving personal info:', error);
        Alert.alert(
          'Error',
          'Failed to save your information. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Sync username (display name) and phone number to auth.users
      console.log('🔄 Syncing username and phone to auth.users...');
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          display_name: username, // Sync username to display_name in user_metadata
        },
        phone: phoneNumber, // Sync phone to auth.users phone field
      });
      
      if (authUpdateError) {
        console.error('⚠️ Warning: Failed to sync to auth.users:', authUpdateError.message);
        // Don't block onboarding if this fails - data is already saved to profile table
      } else {
        console.log('✅ Username and phone synced to auth.users successfully');
      }
      
      console.log('Personal info saved to database:', {
        fullName,
        username,
        dateOfBirth: formattedDate,
        gender: gender,
        phoneNumber,
        profileImage,
      });
      
      if (onContinue) {
        onContinue();
      }
    } catch (error) {
      console.error('Unexpected error saving personal info:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const isFormValid =
    fullName.trim() !== '' &&
    username.trim() !== '' &&
    dateOfBirth !== null &&
    gender.trim() !== '' &&
    phoneNumber.trim() !== '';

  return (
    <Overlay visible={visible} onClose={onClose} onBack={onBack} type="bottom" showBackButton={false}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Progress Indicator */}
        <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />

        {/* Title */}
        <Heading level={2} style={styles.title}>Tell us about yourself</Heading>

        {/* Profile Picture Upload */}
        <TouchableOpacity
          style={styles.profilePicContainer}
          activeOpacity={0.8}
          onPress={() => {
            lightHaptic();
            pickImage();
          }}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <Ionicons name="camera" size={32} color="#00B8A9" />
          )}
        </TouchableOpacity>

        {/* Full Name Input */}
        <Input
          label="Full Name"
          placeholder="Enter your full name"
          value={fullName}
          onChangeText={handleFullNameChange}
          required
        />

        {/* Username Input */}
        <Input
          label="Username"
          placeholder="Choose a username"
          value={username}
          onChangeText={handleUsernameChange}
          helperText="Max 10 characters, no spaces"
          maxLength={10}
          showCharCount
          required
        />

        {/* Date of Birth Input */}
        {Platform.OS === 'web' ? (
          <View style={styles.inputWithIcon}>
            <input
              type="date"
              style={{
                flex: 1,
                fontSize: 16,
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                color: '#333',
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
            <Ionicons name="calendar-outline" size={20} color="#999" style={styles.inputIcon} />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.inputWithIcon}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <Text 
              color={dateOfBirth ? '#333' : '#999'}
              style={{ flex: 1 }}
            >
              {dateOfBirth ? formatDate(dateOfBirth) : 'Date of Birth'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#999" style={styles.inputIcon} />
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
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerButton}>Done</Text>
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

        {/* Gender Picker */}
        <Select
          label="Gender"
          placeholder="Select your gender"
          value={gender}
          onChange={setGender}
          options={genderOptions}
          required
        />

        {/* Phone Number Input */}
        <Input
          label="Phone Number"
          type="phone"
          placeholder="Enter phone number"
          value={phoneNumber}
          onChangeText={handlePhoneNumberChange}
          maxLength={10}
          showCharCount
          required
        />

        {/* Continue Button */}
        <Button
          variant="primary"
          onPress={handleContinue}
          disabled={!isFormValid}
          style={styles.continueButton}
        >
          Continue
        </Button>
      </Animated.View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 32,
  },
  profilePicContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 25,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  continueButton: {
    marginTop: 10,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  inputText: {
    paddingVertical: 0,
  },
  placeholderText: {
    color: '#999',
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
    backgroundColor: '#fff',
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
    borderBottomColor: '#E0E0E0',
  },
  datePickerButton: {
    color: '#EF6F7B',
    fontSize: 16,
    fontWeight: '600',
  },
  datePicker: {
    width: '100%',
    height: 200,
  },
});

export default PersonalInformationOverlay;
