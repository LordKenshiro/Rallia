import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type OverlayType = 'bottom' | 'center';

interface OverlayProps {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void; // Optional separate handler for back button
  children: React.ReactNode;
  type?: OverlayType;
  title?: string;
  showBackButton?: boolean;
  showCloseButton?: boolean;
  dismissOnBackdropPress?: boolean;
  darkBackground?: boolean; // For center overlays with dark content background
  alignTop?: boolean; // Align center overlay to top instead of center
}

const Overlay: React.FC<OverlayProps> = ({
  visible,
  onClose,
  onBack,
  children,
  type = 'bottom',
  title,
  showBackButton = true,
  showCloseButton = true,
  dismissOnBackdropPress = true,
  darkBackground = false,
  alignTop = false,
}) => {
  const handleBackdropPress = () => {
    if (dismissOnBackdropPress) {
      onClose();
    }
  };

  const handleBackPress = () => {
    // If onBack is provided, use it; otherwise fall back to onClose
    if (onBack) {
      onBack();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={type === 'bottom' ? 'slide' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View
          style={[
            styles.overlay,
            type === 'center' && styles.overlayCentered,
            type === 'center' && alignTop && styles.overlayTop,
          ]}
        >
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.container,
                type === 'center' && styles.containerCenter,
                darkBackground && styles.containerDark,
              ]}
            >
              {/* Header - only for bottom type */}
              {type === 'bottom' && (
                <View style={styles.header}>
                  {showBackButton && (
                    <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                      <Ionicons name="chevron-back" size={24} color="#333" />
                    </TouchableOpacity>
                  )}

                  {title && <View style={styles.titleBar} />}

                  {showCloseButton && (
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Content */}
              <View style={styles.content}>{children}</View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTop: {
    justifyContent: 'flex-start',
    paddingTop: 60, // Space from top of screen
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  containerCenter: {
    borderRadius: 16,
    maxHeight: '80%',
    maxWidth: '85%',
    width: '85%',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  containerDark: {
    backgroundColor: '#2C2C2E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  closeButton: {
    padding: 8,
  },
  titleBar: {
    width: 60,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 20,
  },
});

export default Overlay;
