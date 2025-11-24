import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Overlay } from '@rallia/shared-components';
import { useImagePicker } from '../../../../hooks';
import { COLORS } from '@rallia/shared-constants';
import { validateFullName, validateUsername, validatePhoneNumber } from '@rallia/shared-utils';

interface PersonalInformationOverlayProps {
  visible: boolean;
  onClose: () => void;
  onContinue?: () => void;
}

const PersonalInformationOverlay: React.FC<PersonalInformationOverlayProps> = ({
  visible,
  onClose,
  onContinue,
}) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  const genderOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

  // Use custom hook for image picker
  const { image: profileImage, pickImage } = useImagePicker();

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

  const handleDateChange = (event: any, selectedDate?: Date) => {
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

  const handleContinue = () => {
    console.log('Personal info:', {
      fullName,
      username,
      dateOfBirth: formatDate(dateOfBirth),
      gender,
      phoneNumber,
      profileImage,
    });
    // TODO: Save personal information
    if (onContinue) {
      onContinue();
    }
  };

  const handleSelectGender = (selectedGender: string) => {
    setGender(selectedGender);
    setShowGenderPicker(false);
  };

  const isFormValid =
    fullName.trim() !== '' &&
    username.trim() !== '' &&
    dateOfBirth !== null &&
    gender.trim() !== '' &&
    phoneNumber.trim() !== '';

  return (
    <Overlay visible={visible} onClose={onClose} type="bottom">
      <View style={styles.container}>
        {/* Title */}
        <Text style={styles.title}>Tell us about your{'\n'}yourself</Text>

        {/* Profile Picture Upload */}
        <TouchableOpacity
          style={styles.profilePicContainer}
          activeOpacity={0.8}
          onPress={pickImage}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <Ionicons name="camera" size={32} color="#00B8A9" />
          )}
        </TouchableOpacity>

        {/* Full Name Input */}
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={fullName}
          onChangeText={handleFullNameChange}
          autoCapitalize="words"
        />

        {/* Username Input */}
        <TextInput
          style={styles.input}
          placeholder="Username (max 10 chars, no spaces)"
          value={username}
          onChangeText={handleUsernameChange}
          autoCapitalize="none"
          maxLength={10}
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
              style={[styles.inputField, styles.inputText, !dateOfBirth && styles.placeholderText]}
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
        <TouchableOpacity
          style={styles.inputWithIcon}
          onPress={() => setShowGenderPicker(!showGenderPicker)}
          activeOpacity={0.8}
        >
          <Text style={[styles.inputField, styles.inputText, !gender && styles.placeholderText]}>
            {gender || 'Gender'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#999" style={styles.inputIcon} />
        </TouchableOpacity>

        {/* Gender Options Dropdown */}
        {showGenderPicker && (
          <View style={styles.genderOptions}>
            {genderOptions.map(option => (
              <TouchableOpacity
                key={option}
                style={styles.genderOption}
                onPress={() => handleSelectGender(option)}
                activeOpacity={0.7}
              >
                <Text style={styles.genderOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Phone Number Input */}
        <TextInput
          style={styles.input}
          placeholder="Phone Number (10 digits)"
          value={phoneNumber}
          onChangeText={handlePhoneNumberChange}
          keyboardType="numeric"
          maxLength={10}
        />

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, !isFormValid && styles.continueButtonDisabled]}
          onPress={isFormValid ? handleContinue : undefined}
          activeOpacity={isFormValid ? 0.8 : 1}
          disabled={!isFormValid}
        >
          <Text
            style={[styles.continueButtonText, !isFormValid && styles.continueButtonTextDisabled]}
          >
            Continue
          </Text>
        </TouchableOpacity>
      </View>
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
  input: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
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
    position: 'relative',
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
  genderOptions: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  genderOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  genderOptionText: {
    fontSize: 16,
    color: '#333',
  },
  continueButton: {
    backgroundColor: '#EF6F7B',
    borderRadius: 10,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonDisabled: {
    backgroundColor: '#D3D3D3',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#999',
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
