/**
 * Community Screen
 *
 * Main community hub with:
 * - Quick action buttons: Share Lists, Groups, Communities
 * - Player directory for finding and connecting with players
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { lightHaptic } from '@rallia/shared-utils';
import { useAuth, useThemeStyles, useTranslation, type TranslationKey } from '../hooks';
import { useSport } from '../context';
import { spacingPixels } from '@rallia/design-system';
import { primary, neutral } from '@rallia/design-system';
import { PlayerDirectory } from '../features/community';
import type { PlayerSearchResult } from '@rallia/shared-services';
import type { RootStackParamList, CommunityStackParamList } from '../navigation/types';
import type { CompositeNavigationProp } from '@react-navigation/native';

type CommunityNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<CommunityStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface ActionButton {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

const Community = () => {
  const { colors, isDark } = useThemeStyles();
  const { session } = useAuth();
  const { selectedSport } = useSport();
  const navigation = useNavigation<CommunityNavigationProp>();
  const { t } = useTranslation();

  // Theme colors for components
  const themeColors = useMemo(
    () => ({
      background: colors.background,
      cardBackground: colors.cardBackground,
      text: colors.text,
      textSecondary: colors.textSecondary,
      textMuted: colors.textMuted,
      border: colors.border,
      primary: colors.primary,
      inputBackground: colors.inputBackground,
    }),
    [colors]
  );

  // Action button colors
  const buttonColors = useMemo(
    () => ({
      background: isDark ? neutral[800] : primary[50],
      iconColor: isDark ? primary[400] : primary[600],
    }),
    [isDark]
  );

  // Action button handlers
  const handleShareLists = useCallback(() => {
    lightHaptic();
    navigation.navigate('ShareLists');
  }, [navigation]);

  const handleGroups = useCallback(() => {
    lightHaptic();
    navigation.navigate('Groups');
  }, [navigation]);

  const handleCommunities = useCallback(() => {
    lightHaptic();
    navigation.navigate('Communities');
  }, [navigation]);

  const handleTournaments = useCallback(() => {
    lightHaptic();
    // TODO: Implement tournaments functionality
    Alert.alert(t('community.tournaments' as TranslationKey), t('community.tournamentsComingSoon' as TranslationKey));
  }, [t]);

  // Action buttons configuration
  const actionButtons: ActionButton[] = useMemo(
    () => [
      {
        id: 'share-lists',
        icon: 'paper-plane-outline',
        label: t('community.shareLists' as TranslationKey),
        onPress: handleShareLists,
      },
      {
        id: 'groups',
        icon: 'people-outline',
        label: t('community.groups' as TranslationKey),
        onPress: handleGroups,
      },
      {
        id: 'communities',
        icon: 'globe-outline',
        label: t('community.communities' as TranslationKey),
        onPress: handleCommunities,
      },
      {
        id: 'tournaments',
        icon: 'trophy-outline',
        label: t('community.tournaments' as TranslationKey),
        onPress: handleTournaments,
      },
    ],
    [handleShareLists, handleGroups, handleCommunities, handleTournaments, t]
  );

  const handlePlayerPress = useCallback((player: PlayerSearchResult) => {
    // Navigate to player profile screen with selected sport
    navigation.navigate('PlayerProfile', { 
      playerId: player.id,
      sportId: selectedSport?.id,
    });
  }, [navigation, selectedSport?.id]);

  // Render action buttons row
  const renderActionButtons = () => (
    <View style={styles.actionButtonsContainer}>
      {actionButtons.map((button) => (
        <TouchableOpacity
          key={button.id}
          style={styles.actionButton}
          onPress={button.onPress}
          activeOpacity={0.7}
        >
          <View style={[styles.actionButtonIcon, { backgroundColor: buttonColors.background }]}>
            <Ionicons name={button.icon} size={28} color={buttonColors.iconColor} />
          </View>
          <Text size="xs" weight="medium" color={colors.text} style={styles.actionButtonLabel}>
            {button.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      {/* Action Buttons */}
      {renderActionButtons()}

      {/* Find a Partner Section Header */}
      <View style={styles.sectionHeader}>
        <Ionicons name="tennisball-outline" size={20} color={colors.primary} />
        <Text size="lg" weight="bold" color={colors.text} style={styles.sectionTitle}>
          {t('community.findPartner' as TranslationKey)}
        </Text>
      </View>

      {/* Player Directory */}
      <PlayerDirectory
        sportId={selectedSport?.id}
        sportName={selectedSport?.name}
        currentUserId={session?.user?.id}
        colors={themeColors}
        onPlayerPress={handlePlayerPress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: spacingPixels[4],
    paddingTop: spacingPixels[3],
    paddingBottom: spacingPixels[2],
    gap: spacingPixels[6],
  },
  actionButton: {
    alignItems: 'center',
  },
  actionButtonIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacingPixels[2],
  },
  actionButtonLabel: {
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[4],
    paddingTop: spacingPixels[2],
    paddingBottom: spacingPixels[2],
    gap: spacingPixels[2],
  },
  sectionTitle: {
    flex: 1,
  },
});

export default Community;

