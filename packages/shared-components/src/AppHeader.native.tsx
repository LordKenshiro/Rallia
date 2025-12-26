import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useProfile, usePlayerSports } from '@rallia/shared-hooks';
import { Text } from './foundation/Text.native';
import { primary, lightTheme, darkTheme } from '@rallia/design-system';

interface Sport {
  id: string;
  name: string;
  display_name: string;
}

interface AppHeaderProps {
  backgroundColor?: string;
  Logo?: React.ComponentType<{ width: number; height: number }>;
  /** Theme colors - if not provided, uses design system defaults */
  themeColors?: {
    headerBackground: string;
    text: string;
    textMuted: string;
    primary: string;
    primaryForeground: string;
    card: string;
    border: string;
    icon: string;
  };
  /** Whether dark mode is active */
  isDark?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  backgroundColor,
  Logo,
  themeColors,
  isDark = false,
}) => {
  // Use theme colors if provided, otherwise use design system defaults
  const colors = themeColors || {
    headerBackground: isDark ? darkTheme.card : lightTheme.card,
    text: isDark ? darkTheme.foreground : lightTheme.foreground,
    textMuted: isDark ? darkTheme.mutedForeground : lightTheme.mutedForeground,
    primary: isDark ? primary[500] : primary[600],
    primaryForeground: '#ffffff', // base.white
    card: isDark ? darkTheme.card : lightTheme.card,
    border: isDark ? darkTheme.border : lightTheme.border,
    icon: isDark ? darkTheme.foreground : lightTheme.foreground,
  };

  // Use provided backgroundColor or theme headerBackground
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  // Use custom hooks for data fetching
  const { profile, refetch: refetchProfile } = useProfile();
  const { playerSports, refetch: refetchPlayerSports } = usePlayerSports(profile?.id);

  const [userSports, setUserSports] = useState<Sport[]>([]);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [showSportDropdown, setShowSportDropdown] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Check if user is logged in (profile exists)
  const isLoggedIn = !!profile;

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

      playerSports.forEach(ps => {
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
    // Only navigate if logged in
    if (!isLoggedIn) return;
    navigation.navigate('UserProfile');
  };

  const handleNotificationsPress = () => {
    // Only handle if logged in
    if (!isLoggedIn) return;
    console.log('Notifications pressed');
  };

  const handleSettingsPress = () => {
    // Only navigate if logged in
    if (!isLoggedIn) return;
    navigation.navigate('Settings');
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor }]}>
        {/* Left - Profile Picture and Logo */}
        <View style={styles.leftSection}>
          {isLoggedIn && (
            <TouchableOpacity style={styles.iconButton} onPress={handleProfilePress}>
              {profilePictureUrl && !imageLoadError ? (
                <Image
                  source={{ uri: profilePictureUrl }}
                  style={styles.profileImage}
                  onError={error => {
                    console.error(
                      '❌ AppHeader - Failed to load profile image:',
                      error.nativeEvent.error
                    );
                    setImageLoadError(true);
                  }}
                  onLoad={() => {
                    console.log('✅ AppHeader - Profile image loaded successfully');
                    setImageLoadError(false);
                  }}
                />
              ) : (
                <Ionicons name="person-circle-outline" size={28} color={colors.icon} />
              )}
            </TouchableOpacity>
          )}

          {Logo && <Logo width={100} height={30} />}
        </View>

        {/* Center - Sport Selector */}
        <View style={styles.centerSection}>
          {selectedSport && userSports.length > 0 && (
            <TouchableOpacity
              style={[styles.sportSelector, { backgroundColor: colors.primary }]}
              onPress={() => setShowSportDropdown(!showSportDropdown)}
            >
              <Text color={colors.primaryForeground} weight="semibold" size="sm">
                {selectedSport.display_name}
              </Text>
              <Ionicons
                name={showSportDropdown ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.primaryForeground}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Right - Notification and Settings Icons */}
        <View style={styles.rightIcons}>
          {isLoggedIn && (
            <>
              <TouchableOpacity style={styles.iconButton} onPress={handleNotificationsPress}>
                <Ionicons name="notifications-outline" size={24} color={colors.icon} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconButton} onPress={handleSettingsPress}>
                <Ionicons name="settings-outline" size={24} color={colors.icon} />
              </TouchableOpacity>
            </>
          )}
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
            <View style={[styles.dropdownContainer, { backgroundColor: colors.card }]}>
              <ScrollView>
                {userSports.map(sport => (
                  <TouchableOpacity
                    key={sport.id}
                    style={[
                      styles.dropdownItem,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor:
                          selectedSport?.id === sport.id ? colors.card : 'transparent',
                      },
                    ]}
                    onPress={() => handleSportSelect(sport)}
                  >
                    <Text
                      color={selectedSport?.id === sport.id ? colors.primary : colors.text}
                      weight={selectedSport?.id === sport.id ? 'semibold' : 'regular'}
                    >
                      {sport.display_name}
                    </Text>
                    {selectedSport?.id === sport.id && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
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
    // backgroundColor will be set dynamically
  },
  sportSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    // backgroundColor will be set dynamically
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
    borderRadius: 12,
    minWidth: 200,
    maxHeight: 300,
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    // backgroundColor will be set dynamically
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    // borderBottomColor and backgroundColor will be set dynamically
  },
  dropdownItemSelected: {
    // backgroundColor will be set dynamically
  },
});

export default AppHeader;
