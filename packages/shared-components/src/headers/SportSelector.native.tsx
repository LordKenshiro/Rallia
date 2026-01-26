import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../foundation/Text.native';
import {
  lightTheme,
  darkTheme,
  spacingPixels,
  radiusPixels,
  primary,
  neutral,
  duration,
} from '@rallia/design-system';
import { lightHaptic, selectionHaptic } from '@rallia/shared-utils';

export interface Sport {
  id: string;
  name: string;
  display_name: string;
  icon_url?: string | null;
}

export interface SportSelectorProps {
  /** Currently selected sport */
  selectedSport: Sport | null;
  /** All available sports for the user */
  userSports: Sport[];
  /** Callback when a sport is selected */
  onSelectSport: (sport: Sport) => void;
  /** Whether dark mode is enabled */
  isDark?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SportSelector: React.FC<SportSelectorProps> = ({
  selectedSport,
  userSports,
  onSelectSport,
  isDark = false,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  // Theme-aware colors
  const themeColors = isDark ? darkTheme : lightTheme;
  const colors = {
    // Selector button
    selectorBg: primary[500],
    selectorText: '#ffffff', // base.white

    // Dropdown
    dropdownBg: themeColors.card,
    dropdownBorder: themeColors.border,
    itemText: themeColors.foreground,
    itemTextSelected: primary[500],
    itemBg: 'transparent',
    itemBgSelected: isDark ? `${primary[500]}20` : `${primary[500]}10`,
    itemBorder: themeColors.border,

    // Overlay
    overlayBg: 'rgba(0, 0, 0, 0.5)',

    // Icons
    checkmark: primary[500],
    chevron: '#ffffff', // base.white
  };

  // Animate dropdown open/close
  useEffect(() => {
    if (showDropdown) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: duration.fast,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: duration.fast,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: duration.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showDropdown, fadeAnim, scaleAnim]);

  const handleSportSelect = (sport: Sport) => {
    selectionHaptic();
    onSelectSport(sport);
    setShowDropdown(false);
  };

  const handleClose = () => {
    lightHaptic();
    setShowDropdown(false);
  };

  // Don't render if no sports or no selection
  if (!selectedSport || userSports.length === 0) {
    return null;
  }

  // Only show dropdown toggle if user has multiple sports
  const hasMultipleSports = userSports.length > 1;

  const handleButtonPress = () => {
    if (hasMultipleSports) {
      lightHaptic();
      // Animate button press
      Animated.sequence([
        Animated.timing(buttonScaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      setShowDropdown(!showDropdown);
    }
  };

  return (
    <>
      <Animated.View
        style={[
          styles.selectorWrapper,
          {
            transform: [{ scale: buttonScaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.selector, { backgroundColor: colors.selectorBg }]}
          onPress={handleButtonPress}
          activeOpacity={hasMultipleSports ? 0.85 : 1}
          disabled={!hasMultipleSports}
        >
          <Text color={colors.selectorText} weight="semibold" size="xs" numberOfLines={1}>
            {selectedSport.display_name}
          </Text>
          {hasMultipleSports && (
            <Ionicons
              name={showDropdown ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.chevron}
              style={{ marginLeft: 2 }}
            />
          )}
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={showDropdown}
        transparent
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleClose}>
          <Animated.View
            style={[
              styles.overlayBackground,
              {
                opacity: fadeAnim,
                backgroundColor: colors.overlayBg,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dropdownContainer,
              {
                backgroundColor: colors.dropdownBg,
                borderColor: colors.dropdownBorder,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.dropdownHeader, { borderBottomColor: colors.itemBorder }]}>
              <Text size="base" weight="semibold" color={themeColors.foreground}>
                Select Sport
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={themeColors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Sport list */}
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              bounces={userSports.length > 5}
            >
              {userSports.map((sport, index) => {
                const isSelected = selectedSport?.id === sport.id;
                const isLast = index === userSports.length - 1;

                return (
                  <TouchableOpacity
                    key={sport.id}
                    style={[
                      styles.dropdownItem,
                      {
                        backgroundColor: isSelected ? colors.itemBgSelected : colors.itemBg,
                        borderBottomColor: isLast ? 'transparent' : colors.itemBorder,
                      },
                    ]}
                    onPress={() => handleSportSelect(sport)}
                    activeOpacity={0.7}
                  >
                    {/* Sport icon placeholder */}
                    <View
                      style={[
                        styles.sportIcon,
                        {
                          backgroundColor: isSelected
                            ? `${primary[500]}25`
                            : isDark
                              ? neutral[700]
                              : neutral[100],
                        },
                      ]}
                    >
                      <Ionicons
                        name="tennisball-outline"
                        size={18}
                        color={isSelected ? primary[500] : themeColors.mutedForeground}
                      />
                    </View>

                    {/* Sport name */}
                    <View style={styles.sportInfo}>
                      <Text
                        size="base"
                        weight={isSelected ? 'semibold' : 'regular'}
                        color={isSelected ? colors.itemTextSelected : colors.itemText}
                      >
                        {sport.display_name}
                      </Text>
                    </View>

                    {/* Checkmark for selected */}
                    {isSelected && (
                      <View style={styles.checkContainer}>
                        <Ionicons name="checkmark-circle" size={22} color={colors.checkmark} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selectorWrapper: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radiusPixels.full,
    shadowColor: primary[500],
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 0,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  dropdownContainer: {
    width: '80%',
    maxWidth: 320,
    maxHeight: SCREEN_HEIGHT * 0.6,
    borderRadius: radiusPixels.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3.5],
    borderBottomWidth: 1,
  },
  scrollView: {
    flexGrow: 0,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3.5],
    borderBottomWidth: 1,
  },
  sportIcon: {
    width: spacingPixels[10],
    height: spacingPixels[10],
    borderRadius: radiusPixels.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingPixels[3],
  },
  sportInfo: {
    flex: 1,
  },
  checkContainer: {
    marginLeft: spacingPixels[2],
  },
});

export default SportSelector;
