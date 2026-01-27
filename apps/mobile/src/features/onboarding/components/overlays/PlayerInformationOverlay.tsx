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
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Overlay, Button, Heading, Text } from '@rallia/shared-components';
import { COLORS } from '@rallia/shared-constants';
import { supabase, Logger } from '@rallia/shared-services';
import { lightHaptic, mediumHaptic } from '@rallia/shared-utils';
import { useThemeStyles, usePlayer, useProfile, useTranslation } from '../../../../hooks';
import type { TranslationKey } from '@rallia/shared-translations';

interface PlayerInformationOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSave?: () => void; // Called only when data is successfully saved
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
  onSave,
  initialData,
}) => {
  const { colors } = useThemeStyles();
  const { t } = useTranslation();
  const { refetch: refetchPlayer } = usePlayer();
  const { refetch: refetchProfile } = useProfile();
  const [username, setUsername] = useState(initialData?.username || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [preferredPlayingHand, setPreferredPlayingHand] = useState<string>(
    initialData?.preferredPlayingHand || ''
  );
  const [maximumTravelDistance, setMaximumTravelDistance] = useState<number>(
    initialData?.maximumTravelDistance || 5
  );
  const [isSaving, setIsSaving] = useState(false);

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
    if (isSaving) return;

    mediumHaptic();
    setIsSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsSaving(false);
        Alert.alert(t('alerts.error' as TranslationKey), t('onboarding.validation.playerNotFound' as TranslationKey));
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
        Logger.error('Failed to update profile', profileUpdateError as Error, { userId: user.id });
        setIsSaving(false);
        Alert.alert(t('alerts.error' as TranslationKey), t('onboarding.validation.failedToUpdateProfile' as TranslationKey));
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
        Logger.error('Failed to update player', playerUpdateError as Error, { userId: user.id });
        setIsSaving(false);
        Alert.alert(t('alerts.error' as TranslationKey), t('onboarding.validation.failedToUpdateProfile' as TranslationKey));
        return;
      }

      // Sync display_name to auth.users metadata
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: { display_name: username },
      });

      if (authUpdateError) {
        Logger.warn('Failed to sync display_name to auth.users', {
          error: authUpdateError,
          userId: user.id,
        });
        // Don't block the save - profile table is already updated
      }

      // Refetch player and profile data to update all consumers
      await refetchPlayer();
      await refetchProfile();

      // Show success toast
      if (Platform.OS === 'android') {
        ToastAndroid.show(t('onboarding.successMessages.playerInfoUpdated' as TranslationKey), ToastAndroid.LONG);
      } else {
        Alert.alert(t('alerts.success' as TranslationKey), t('onboarding.successMessages.playerInfoUpdated' as TranslationKey));
      }

      // Notify parent that data was saved successfully
      onSave?.();

      // Close modal automatically after brief delay
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      Logger.error('Unexpected error updating player information', error as Error);
      setIsSaving(false);
      Alert.alert(t('alerts.error' as TranslationKey), t('onboarding.validation.unexpectedError' as TranslationKey));
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
        <Heading level={2} style={[styles.title, { color: colors.text }]}>
          Update your player information
        </Heading>

        {/* Username Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Username</Text>
          <View
            style={[
              styles.inputWithIcon,
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBackground },
            ]}
          >
            <TextInput
              placeholder="Enter your username"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              maxLength={20}
              style={[styles.inputField, { color: colors.text }]}
            />
          </View>
        </View>

        {/* Bio Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Bio</Text>
          <View
            style={[
              styles.inputWithIcon,
              styles.bioInput,
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBackground },
            ]}
          >
            <TextInput
              placeholder="Tell us about yourself..."
              placeholderTextColor={colors.textMuted}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              maxLength={300}
              style={[styles.inputField, styles.bioInputField, { color: colors.text }]}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Preferred Playing Hand */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Preferred Playing Hand</Text>
          <View style={[styles.handButtonsContainer, { backgroundColor: colors.inputBackground }]}>
            <TouchableOpacity
              style={[
                styles.handButton,
                styles.leftButton,
                preferredPlayingHand === 'left' && [
                  styles.handButtonActive,
                  { backgroundColor: colors.primary },
                ],
              ]}
              onPress={() => {
                lightHaptic();
                setPreferredPlayingHand('left');
              }}
            >
              <Text
                style={
                  preferredPlayingHand === 'left'
                    ? [
                        styles.handButtonText,
                        styles.handButtonTextActive,
                        { color: colors.primaryForeground },
                      ]
                    : [styles.handButtonText, { color: colors.textMuted }]
                }
              >
                Left
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.handButton,
                styles.middleButton,
                preferredPlayingHand === 'right' && [
                  styles.handButtonActive,
                  { backgroundColor: colors.primary },
                ],
              ]}
              onPress={() => {
                lightHaptic();
                setPreferredPlayingHand('right');
              }}
            >
              <Text
                style={
                  preferredPlayingHand === 'right'
                    ? [
                        styles.handButtonText,
                        styles.handButtonTextActive,
                        { color: colors.primaryForeground },
                      ]
                    : [styles.handButtonText, { color: colors.textMuted }]
                }
              >
                Right
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.handButton,
                styles.rightButton,
                preferredPlayingHand === 'both' && [
                  styles.handButtonActive,
                  { backgroundColor: colors.primary },
                ],
              ]}
              onPress={() => {
                lightHaptic();
                setPreferredPlayingHand('both');
              }}
            >
              <Text
                style={
                  preferredPlayingHand === 'both'
                    ? [
                        styles.handButtonText,
                        styles.handButtonTextActive,
                        { color: colors.primaryForeground },
                      ]
                    : [styles.handButtonText, { color: colors.textMuted }]
                }
              >
                Both
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Maximum Travel Distance */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Maximum Travel Distance</Text>
          <View
            style={[
              styles.sliderContainer,
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBackground },
            ]}
          >
            <Text style={[styles.sliderValue, { color: colors.text }]}>
              {maximumTravelDistance} km
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={50}
              step={1}
              value={maximumTravelDistance}
              onValueChange={setMaximumTravelDistance}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.divider}
              thumbTintColor={colors.primary}
            />
          </View>
        </View>

        {/* Save Button */}
        <Button
          variant="primary"
          onPress={handleSave}
          disabled={!isFormValid || isSaving}
          style={styles.saveButton}
        >
          {isSaving ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : 'Save'}
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
    marginBottom: 8,
  },
  inputWithIcon: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderWidth: 1,
  },
  bioInput: {
    minHeight: 100,
    paddingVertical: 12,
  },
  inputField: {
    fontSize: 16,
    padding: 0,
  },
  bioInputField: {
    minHeight: 80,
  },
  handButtonsContainer: {
    flexDirection: 'row',
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
    // backgroundColor applied inline
  },
  handButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  handButtonTextActive: {
    fontWeight: '600',
  },
  sliderContainer: {
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '600',
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
