import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NotificationButtonProps {
  onPress?: () => void;
  size?: number;
  color?: string;
}

const NotificationButton: React.FC<NotificationButtonProps> = ({ 
  onPress,
  size = 24,
  color = '#333'
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      console.log('Notifications pressed');
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Ionicons name="notifications-outline" size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
});

export default NotificationButton;
