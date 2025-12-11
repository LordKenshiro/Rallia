import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NotificationButtonProps {
  /** Callback when button is pressed */
  onPress?: () => void;
  /** Icon size */
  size?: number;
  /** Icon color */
  color?: string;
  /** Number of unread notifications to display as badge */
  unreadCount?: number;
  /** Badge background color */
  badgeColor?: string;
  /** Badge text color */
  badgeTextColor?: string;
}

const NotificationButton: React.FC<NotificationButtonProps> = ({
  onPress,
  size = 24,
  color = '#333',
  unreadCount = 0,
  badgeColor = '#EF6F7B',
  badgeTextColor = '#fff',
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      console.log('Notifications pressed');
    }
  };

  // Format count for display (99+ for large numbers)
  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();
  const showBadge = unreadCount > 0;

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <View style={styles.iconContainer}>
        <Ionicons name="notifications-outline" size={size} color={color} />
        {showBadge && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: badgeColor,
                // Adjust badge size based on digit count
                minWidth: unreadCount > 99 ? 22 : unreadCount > 9 ? 18 : 16,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color: badgeTextColor,
                  fontSize: unreadCount > 99 ? 8 : unreadCount > 9 ? 9 : 10,
                },
              ]}
            >
              {displayCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default NotificationButton;
