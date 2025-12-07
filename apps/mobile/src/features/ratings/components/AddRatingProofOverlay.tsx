import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';

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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.container,
            {
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
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="chevron-back" size={28} color="#000" />
              </TouchableOpacity>
              <View style={styles.headerSpacer} />
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <View style={styles.titleContainer}>
              <Text size="xl" weight="bold" color="#000" style={styles.title}>
                Add a new rating proof to
              </Text>
              <Text size="xl" weight="bold" color="#000" style={styles.title}>
                your player profile
              </Text>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => handleSelectType('external_link')}
                activeOpacity={0.7}
              >
                <Ionicons name="link" size={20} color="#fff" />
                <Text size="base" weight="medium" color="#fff">
                  External Link
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => handleSelectType('video')}
                activeOpacity={0.7}
              >
                <Ionicons name="videocam" size={20} color="#fff" />
                <Text size="base" weight="medium" color="#fff">
                  Video Recording
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => handleSelectType('image')}
                activeOpacity={0.7}
              >
                <Ionicons name="image" size={20} color="#fff" />
                <Text size="base" weight="medium" color="#fff">
                  Image
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => handleSelectType('document')}
                activeOpacity={0.7}
              >
                <Ionicons name="document-text" size={20} color="#fff" />
                <Text size="base" weight="medium" color="#fff">
                  Document
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>

              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeActionButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text size="base" weight="medium" color="#EF6F7B">
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
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
    backgroundColor: '#EF6F7B', // Coral color from the design
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
  },
  closeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8EA', // Light coral/pink background
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },
});

export default AddRatingProofOverlay;
