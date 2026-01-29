/**
 * ImagePickerSheet - Custom bottom sheet for image selection
 *
 * Replaces the native Alert.alert with a styled bottom sheet that matches
 * the app's design system, providing options for camera and gallery.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@rallia/shared-components';
import { useTheme } from '@rallia/shared-hooks';
import {
  lightTheme,
  darkTheme,
  spacingPixels,
  radiusPixels,
  primary,
  neutral,
} from '@rallia/design-system';
import { lightHaptic } from '@rallia/shared-utils';

interface ImagePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseFromGallery: () => void;
  title?: string;
  cameraLabel?: string;
  galleryLabel?: string;
  cancelLabel?: string;
  cameraDisabled?: boolean;
  galleryDisabled?: boolean;
}

const ImagePickerSheet: React.FC<ImagePickerSheetProps> = ({
  visible,
  onClose,
  onTakePhoto,
  onChooseFromGallery,
  title = 'Change Profile Picture',
  cameraLabel = 'Take Photo',
  galleryLabel = 'Choose from Gallery',
  cancelLabel = 'Cancel',
  cameraDisabled = false,
  galleryDisabled = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const themeColors = isDark ? darkTheme : lightTheme;

  const translateY = useSharedValue(300);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(300, { duration: 150 });
    }
  }, [visible, translateY, opacity]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleClose = () => {
    lightHaptic();
    onClose();
  };

  const handleTakePhoto = () => {
    lightHaptic();
    onClose();
    // Small delay to let the sheet close animation start
    setTimeout(() => onTakePhoto(), 100);
  };

  const handleChooseGallery = () => {
    lightHaptic();
    onClose();
    // Small delay to let the sheet close animation start
    setTimeout(() => onChooseFromGallery(), 100);
  };

  const colors = {
    background: themeColors.background,
    cardBackground: themeColors.card,
    text: themeColors.foreground,
    textSecondary: isDark ? primary[300] : neutral[600],
    textMuted: themeColors.mutedForeground,
    border: themeColors.border,
    iconPrimary: primary[500],
    iconSecondary: isDark ? neutral[400] : neutral[500],
    overlay: 'rgba(0, 0, 0, 0.5)',
    danger: '#EF4444',
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <Animated.View
            style={[styles.backdrop, backdropStyle, { backgroundColor: colors.overlay }]}
          />
        </Pressable>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            {
              backgroundColor: colors.cardBackground,
              paddingBottom: insets.bottom + spacingPixels[4],
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text size="lg" weight="semibold" color={colors.text}>
              {title}
            </Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Take Photo */}
            <TouchableOpacity
              style={[styles.optionButton, { borderBottomColor: colors.border }]}
              onPress={handleTakePhoto}
              disabled={cameraDisabled}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.optionIconContainer,
                  { backgroundColor: isDark ? neutral[800] : neutral[100] },
                ]}
              >
                <Ionicons
                  name="camera"
                  size={22}
                  color={cameraDisabled ? colors.textMuted : colors.iconPrimary}
                />
              </View>
              <Text
                size="base"
                weight="medium"
                color={cameraDisabled ? colors.textMuted : colors.text}
              >
                {cameraLabel}
              </Text>
            </TouchableOpacity>

            {/* Choose from Gallery */}
            <TouchableOpacity
              style={[styles.optionButton, { borderBottomWidth: 0 }]}
              onPress={handleChooseGallery}
              disabled={galleryDisabled}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.optionIconContainer,
                  { backgroundColor: isDark ? neutral[800] : neutral[100] },
                ]}
              >
                <Ionicons
                  name="images"
                  size={22}
                  color={galleryDisabled ? colors.textMuted : colors.iconPrimary}
                />
              </View>
              <Text
                size="base"
                weight="medium"
                color={galleryDisabled ? colors.textMuted : colors.text}
              >
                {galleryLabel}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: isDark ? neutral[800] : neutral[100] }]}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text size="base" weight="semibold" color={colors.textSecondary}>
              {cancelLabel}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: radiusPixels.xl,
    borderTopRightRadius: radiusPixels.xl,
    paddingHorizontal: spacingPixels[5],
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacingPixels[3],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  titleContainer: {
    alignItems: 'center',
    paddingVertical: spacingPixels[3],
  },
  optionsContainer: {
    marginTop: spacingPixels[2],
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingPixels[4],
    borderBottomWidth: 1,
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radiusPixels.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingPixels[4],
  },
  cancelButton: {
    marginTop: spacingPixels[5],
    paddingVertical: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    alignItems: 'center',
  },
});

export default ImagePickerSheet;
