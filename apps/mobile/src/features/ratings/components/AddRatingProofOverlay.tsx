import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { useThemeStyles } from '../../../hooks';

interface AddRatingProofOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSelectProofType: (type: 'external_link' | 'video' | 'image' | 'document') => void;
}

const AddRatingProofOverlay: React.FC<AddRatingProofOverlayProps> = ({
  visible,
  onClose,
  onSelectProofType,
}) => {
  const { colors, isDark } = useThemeStyles();
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  const handleSelectType = (type: 'external_link' | 'video' | 'image' | 'document') => {
    onSelectProofType(type);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={[
          styles.overlay,
          {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
          },
        ]}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.card,
              opacity: fadeAnim,
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity activeOpacity={1}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="chevron-back" size={28} color={colors.text} />
              </TouchableOpacity>
              <View style={styles.headerSpacer} />
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <View style={styles.titleContainer}>
              <Text size="xl" weight="bold" color={colors.text} style={styles.title}>
                Add a new rating proof to
              </Text>
              <Text size="xl" weight="bold" color={colors.text} style={styles.title}>
                your player profile
              </Text>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[styles.optionButton, { backgroundColor: colors.primary }]}
                onPress={() => handleSelectType('external_link')}
                activeOpacity={0.7}
              >
                <Ionicons name="link" size={20} color={colors.primaryForeground} />
                <Text size="base" weight="medium" color={colors.primaryForeground}>
                  External Link
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.primaryForeground} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionButton, { backgroundColor: colors.primary }]}
                onPress={() => handleSelectType('video')}
                activeOpacity={0.7}
              >
                <Ionicons name="videocam" size={20} color={colors.primaryForeground} />
                <Text size="base" weight="medium" color={colors.primaryForeground}>
                  Video Recording
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.primaryForeground} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionButton, { backgroundColor: colors.primary }]}
                onPress={() => handleSelectType('image')}
                activeOpacity={0.7}
              >
                <Ionicons name="image" size={20} color={colors.primaryForeground} />
                <Text size="base" weight="medium" color={colors.primaryForeground}>
                  Image
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.primaryForeground} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionButton, { backgroundColor: colors.primary }]}
                onPress={() => handleSelectType('document')}
                activeOpacity={0.7}
              >
                <Ionicons name="document-text" size={20} color={colors.primaryForeground} />
                <Text size="base" weight="medium" color={colors.primaryForeground}>
                  Document
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.primaryForeground} />
              </TouchableOpacity>

              {/* Close Button */}
              <TouchableOpacity
                style={[styles.closeActionButton, { backgroundColor: colors.inputBackground }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text size="base" weight="medium" color={colors.primary}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    // backgroundColor is set inline based on theme (isDark)
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    // backgroundColor is set inline based on theme (colors.card)
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    textAlign: 'center',
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor is set inline based on theme (colors.primary)
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
  },
  closeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor is set inline based on theme (colors.inputBackground)
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },
});

export default AddRatingProofOverlay;
