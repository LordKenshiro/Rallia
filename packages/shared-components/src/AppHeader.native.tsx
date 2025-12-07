import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useProfile, usePlayerSports } from '@rallia/shared-hooks';
import { Text } from './foundation/Text.native';

interface Sport {
  id: string;
  name: string;
  display_name: string;
}

interface AppHeaderProps {
  backgroundColor?: string;
  Logo?: React.ComponentType<{ width: number; height: number }>;
}

const AppHeader: React.FC<AppHeaderProps> = ({ backgroundColor = '#C8F2EF', Logo }) => {
  const navigation = useNavigation();
  
  // Use custom hooks for data fetching
  const { profile, refetch: refetchProfile } = useProfile();
  const { playerSports, refetch: refetchPlayerSports } = usePlayerSports();
  
  const [userSports, setUserSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [showSportDropdown, setShowSportDropdown] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Extract profile picture URL from profile data
  const profilePictureUrl = profile?.profile_picture_url || null;

  // Debug profile picture URL and reset error state when URL changes
  useEffect(() => {
    if (profile) {
      console.log('📸 AppHeader - Profile picture URL:', profilePictureUrl);
      console.log('📋 AppHeader - Full profile data:', profile);
      // Reset error state when profile picture URL changes
      setImageLoadError(false);
    }
  }, [profile, profilePictureUrl]);

  // Process player sports data when it changes
  useEffect(() => {
    if (playerSports && playerSports.length > 0) {
      const sports: Sport[] = [];
      
      playerSports.forEach((ps) => {
        const sportData = Array.isArray(ps.sport) ? ps.sport[0] : ps.sport;
        if (sportData && typeof sportData === 'object') {
          sports.push({
            id: sportData.id,
            name: sportData.name,
            display_name: sportData.display_name,
          });
        }
      });
      
      setUserSports(sports);
      
      // Set first sport as default if none selected
      if (!selectedSport && sports.length > 0) {
        setSelectedSport(sports[0]);
      }
      
      console.log('🏆 User sports loaded:', sports);
    } else {
      setUserSports([]);
      setSelectedSport(null);
    }
  }, [playerSports, selectedSport]);

  // Refetch data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchPlayerSports();
    }, [refetchProfile, refetchPlayerSports])
  );

  const handleSportSelect = (sport: Sport) => {
    setSelectedSport(sport);
    setShowSportDropdown(false);
    console.log('Selected sport:', sport.display_name);
  };

  const handleProfilePress = () => {
    // Navigate to UserProfile screen
    (navigation as any).navigate('UserProfile');
  };

  const handleNotificationsPress = () => {
    // Handle notifications press
    console.log('Notifications pressed');
  };

  const handleSettingsPress = () => {
    // Navigate to Settings screen
    (navigation as any).navigate('Settings');
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor }]}>
        {/* Left - Profile Picture and Logo */}
        <View style={styles.leftSection}>
          <TouchableOpacity style={styles.iconButton} onPress={handleProfilePress}>
            {profilePictureUrl && !imageLoadError ? (
              <Image 
                source={{ uri: profilePictureUrl }} 
                style={styles.profileImage}
                onError={(error) => {
                  console.error('❌ AppHeader - Failed to load profile image:', error.nativeEvent.error);
                  setImageLoadError(true);
                }}
                onLoad={() => {
                  console.log('✅ AppHeader - Profile image loaded successfully');
                  setImageLoadError(false);
                }}
              />
            ) : (
              <Ionicons name="person-circle-outline" size={28} color="#333" />
            )}
          </TouchableOpacity>
          
          {Logo && <Logo width={100} height={30} />}
        </View>

        {/* Center - Sport Selector */}
        <View style={styles.centerSection}>
          {selectedSport && userSports.length > 0 && (
            <TouchableOpacity 
              style={styles.sportSelector}
              onPress={() => setShowSportDropdown(!showSportDropdown)}
            >
              <Text color="#fff" weight="semibold" size="sm">
                {selectedSport.display_name}
              </Text>
              <Ionicons 
                name={showSportDropdown ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#fff" 
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Right - Notification and Settings Icons */}
        <View style={styles.rightIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={handleNotificationsPress}>
            <Ionicons name="notifications-outline" size={24} color="#333" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={handleSettingsPress}>
            <Ionicons name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sport Dropdown Modal */}
      {showSportDropdown && userSports.length > 1 && (
        <Modal
          visible={showSportDropdown}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSportDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSportDropdown(false)}
          >
            <View style={styles.dropdownContainer}>
              <ScrollView>
                {userSports.map((sport) => (
                  <TouchableOpacity
                    key={sport.id}
                    style={[
                      styles.dropdownItem,
                      selectedSport?.id === sport.id && styles.dropdownItemSelected
                    ]}
                    onPress={() => handleSportSelect(sport)}
                  >
                    <Text 
                      color={selectedSport?.id === sport.id ? '#FF7B9C' : '#333'}
                      weight={selectedSport?.id === sport.id ? 'semibold' : 'regular'}
                    >
                      {sport.display_name}
                    </Text>
                    {selectedSport?.id === sport.id && (
                      <Ionicons name="checkmark" size={20} color="#FF7B9C" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
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
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  centerSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  iconButton: {
    padding: 4,
  },
  profileImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
  },
  sportSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF7B9C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 80,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 200,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemSelected: {
    backgroundColor: '#FFF5F7',
  },
});

export default AppHeader;
