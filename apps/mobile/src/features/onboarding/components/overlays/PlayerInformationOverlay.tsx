import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Alert,
  TextInput,
  ToastAndroid,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { 
  Overlay, 
  Button, 
  Heading, 
  Text 
} from '@rallia/shared-components';
import { COLORS } from '@rallia/shared-constants';
import { supabase } from '@rallia/shared-services';
import { lightHaptic, mediumHaptic } from '../../../../utils/haptics';

interface PlayerInformationOverlayProps {
  visible: boolean;
  onClose: () => void;
  initialData?: {
    username?: string;
    bio?: string;
    preferredPlayingHand?: string;
    maximumTravelDistance?: number;
  };
}

const PlayerInformationOverlay: React.FC<PlayerInformationOverlayProps> = ({
  visible,
  onClose,
  initialData,
}) => {
  const [username, setUsername] = useState(initialData?.username || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [preferredPlayingHand, setPreferredPlayingHand] = useState<string>(
    initialData?.preferredPlayingHand || ''
  );
  const [maximumTravelDistance, setMaximumTravelDistance] = useState<number>(
    initialData?.maximumTravelDistance || 5
  );

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Update local state when initialData changes
  useEffect(() => {
    if (initialData) {
      setUsername(initialData.username || '');
      setBio(initialData.bio || '');
      setPreferredPlayingHand(initialData.preferredPlayingHand || '');
      setMaximumTravelDistance(initialData.maximumTravelDistance || 5);
    }
  }, [initialData]);

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

  const handleSave = async () => {
    mediumHaptic();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'User not found');
        return;
      }

      // Update profile table (username and bio)
      const { error: profileUpdateError } = await supabase
        .from('profile')
        .update({
          display_name: username,
          bio: bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileUpdateError) {
        console.error('Error updating profile:', profileUpdateError);
        Alert.alert('Error', 'Failed to update your information. Please try again.');
        return;
      }

      // Update player table (playing hand and travel distance)
      const { error: playerUpdateError } = await supabase
        .from('player')
        .update({
          playing_hand: preferredPlayingHand,
          max_travel_distance: maximumTravelDistance,
        })
        .eq('id', user.id);

      if (playerUpdateError) {
        console.error('Error updating player:', playerUpdateError);
        Alert.alert('Error', 'Failed to update your information. Please try again.');
        return;
      }

      // Sync display_name to auth.users metadata
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: { display_name: username },
      });

      if (authUpdateError) {
        console.error('Warning: Failed to sync display_name to auth.users:', authUpdateError);
        // Don't block the save - profile table is already updated
      }

      // Show success toast
      if (Platform.OS === 'android') {
        ToastAndroid.show('Successfully updated Player Information', ToastAndroid.LONG);
      } else {
        Alert.alert('Success', 'Successfully updated Player Information');
      }

      // Close modal automatically after brief delay
      setTimeout(() => {
        onClose();
      }, 500);

    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const isFormValid = username.trim() !== '';

  return (
    <Overlay visible={visible} onClose={onClose} type="bottom" showBackButton={false}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Title */}
        <Heading level={2} style={styles.title}>
          Update your player information
        </Heading>

        {/* Username Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Username</Text>
          <View style={styles.inputWithIcon}>
            <TextInput
              placeholder="Enter your username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              maxLength={20}
              style={styles.inputField}
            />
          </View>
        </View>

        {/* Bio Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Bio</Text>
          <View style={[styles.inputWithIcon, styles.bioInput]}>
            <TextInput
              placeholder="Tell us about yourself..."
              placeholderTextColor="#999"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              maxLength={300}
              style={[styles.inputField, styles.bioInputField]}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Preferred Playing Hand */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Preferred Playing Hand</Text>
          <View style={styles.handButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.handButton,
                styles.leftButton,
                preferredPlayingHand === 'left' && styles.handButtonActive,
              ]}
              onPress={() => {
                lightHaptic();
                setPreferredPlayingHand('left');
              }}
            >
              <Text
                style={
                  preferredPlayingHand === 'left'
                    ? [styles.handButtonText, styles.handButtonTextActive]
                    : styles.handButtonText
                }
              >
                Left
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.handButton,
                styles.middleButton,
                preferredPlayingHand === 'right' && styles.handButtonActive,
              ]}
              onPress={() => {
                lightHaptic();
                setPreferredPlayingHand('right');
              }}
            >
              <Text
                style={
                  preferredPlayingHand === 'right'
                    ? [styles.handButtonText, styles.handButtonTextActive]
                    : styles.handButtonText
                }
              >
                Right
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.handButton,
                styles.rightButton,
                preferredPlayingHand === 'both' && styles.handButtonActive,
              ]}
              onPress={() => {
                lightHaptic();
                setPreferredPlayingHand('both');
              }}
            >
              <Text
                style={
                  preferredPlayingHand === 'both'
                    ? [styles.handButtonText, styles.handButtonTextActive]
                    : styles.handButtonText
                }
              >
                Both
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Maximum Travel Distance */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Maximum Travel Distance</Text>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderValue}>{maximumTravelDistance} km</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={50}
              step={1}
              value={maximumTravelDistance}
              onValueChange={setMaximumTravelDistance}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor={COLORS.primary}
            />
          </View>
        </View>

        {/* Save Button */}
        <Button
          variant="primary"
          onPress={handleSave}
          disabled={!isFormValid}
          style={styles.saveButton}
        >
          Save
        </Button>
      </Animated.View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 28,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWithIcon: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  bioInput: {
    minHeight: 100,
    paddingVertical: 12,
  },
  inputField: {
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  bioInputField: {
    minHeight: 80,
  },
  handButtonsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    padding: 4,
  },
  handButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftButton: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  middleButton: {
    marginHorizontal: 4,
  },
  rightButton: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  handButtonActive: {
    backgroundColor: COLORS.primary,
  },
  handButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  handButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  sliderContainer: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  saveButton: {
    marginTop: 10,
    backgroundColor: COLORS.accent, // Coral/pink color
  },
});

export default PlayerInformationOverlay;
