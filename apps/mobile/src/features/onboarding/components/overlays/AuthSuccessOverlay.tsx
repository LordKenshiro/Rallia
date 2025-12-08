import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Overlay } from '@rallia/shared-components';
import { COLORS } from '@rallia/shared-constants';
import { Logger } from '@rallia/shared-services';
import { lightHaptic, mediumHaptic } from '@rallia/shared-utils';

interface AuthSuccessOverlayProps {
  visible: boolean;
  onClose: () => void;
}

const AuthSuccessOverlay: React.FC<AuthSuccessOverlayProps> = ({ visible, onClose }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Trigger animations when overlay becomes visible
  useEffect(() => {
    if (visible) {
      // Reset animation values
      fadeAnim.setValue(0);
      slideAnim.setValue(50);

      // Run animations in parallel
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

  const handleCreateMatch = () => {
    mediumHaptic();
    Logger.logUserAction('create_match_intent', { source: 'auth_success_overlay' });
    // TODO: Navigate to create match screen
    onClose();
  };

  const handleJoinMatch = () => {
    mediumHaptic();
    Logger.logUserAction('join_match_intent', { source: 'auth_success_overlay' });
    // TODO: Navigate to join match screen
    onClose();
  };

  const handleJoinCommunity = () => {
    mediumHaptic();
    Logger.logUserAction('join_community_intent', { source: 'auth_success_overlay' });
    // TODO: Navigate to community screen
    onClose();
  };

  const handleClose = () => {
    lightHaptic();
    onClose();
  };

  return (
    <Overlay visible={visible} onClose={handleClose} showBackButton={false}>
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
        <Text style={styles.title}>Welcome to Rallia!</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Your account was created successfully. Here are some actions you can now take.
        </Text>

        {/* Action Options */}
        <View style={styles.actionsContainer}>
          {/* Create a new match */}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleCreateMatch}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="tennisball-outline" size={24} color={COLORS.primary} />
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Create a new match</Text>
                <Text style={styles.actionDescription}>
                  Create a new match and let other players join
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          {/* Join a match */}
          <TouchableOpacity style={styles.actionItem} onPress={handleJoinMatch} activeOpacity={0.7}>
            <View style={styles.actionLeft}>
              <Ionicons name="location-outline" size={24} color={COLORS.primary} />
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Join a match</Text>
                <Text style={styles.actionDescription}>
                  Browse public matches and join a game nearby
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          {/* Join a community */}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleJoinCommunity}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="people-outline" size={24} color={COLORS.primary} />
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Join a community</Text>
                <Text style={styles.actionDescription}>
                  Create a new match and let other players join
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.8}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  actionsContainer: {
    marginBottom: 25,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 12,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  closeButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.overlayDark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AuthSuccessOverlay;
