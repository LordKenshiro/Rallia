import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import RalliaLogo from '../../assets/images/light mode logo.svg';

interface AppHeaderProps {
  backgroundColor?: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({ backgroundColor = '#C8F2EF' }) => {
  const navigation = useNavigation();

  const handleProfilePress = () => {
    // Navigate to Profile screen
    navigation.navigate('Profile' as never);
  };

  const handleNotificationsPress = () => {
    // Handle notifications press
    console.log('Notifications pressed');
  };

  const handleSettingsPress = () => {
    // Handle settings press
    console.log('Settings pressed');
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Left - Profile Icon */}
      <TouchableOpacity 
        style={styles.iconButton} 
        onPress={handleProfilePress}
      >
        <Ionicons name="person-circle-outline" size={28} color="#333" />
      </TouchableOpacity>

      {/* Center - Rallia Logo */}
      <View style={styles.logoContainer}>
        <RalliaLogo width={100} height={30} />
      </View>

      {/* Right - Notification and Settings Icons */}
      <View style={styles.rightIcons}>
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={handleNotificationsPress}
        >
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={handleSettingsPress}
        >
          <Ionicons name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 20,
  },
  iconButton: {
    padding: 4,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});

export default AppHeader;
