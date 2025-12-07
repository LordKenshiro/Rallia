import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface SettingsButtonProps {
  size?: number;
  color?: string;
}

const SettingsButton: React.FC<SettingsButtonProps> = ({ 
  size = 24,
  color = '#333'
}) => {
  const navigation = useNavigation();

  const handlePress = () => {
    (navigation as any).navigate('Settings');
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Ionicons name="settings-outline" size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 4,
    marginRight: 4,
  },
});

export default SettingsButton;
