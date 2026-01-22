/**
 * Player Invite Bottom Sheet
 *
 * A modal bottom sheet that wraps the PlayerInviteStep component.
 * Opens when the match host wants to invite players from the MatchDetailSheet.
 */

import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import {
  lightTheme,
  darkTheme,
  radiusPixels,
  spacingPixels,
  primary,
  neutral,
} from '@rallia/design-system';
import { selectionHaptic } from '@rallia/shared-utils';
import { useTheme, useMatch } from '@rallia/shared-hooks';
import { usePlayerInviteSheet } from '../context/PlayerInviteSheetContext';
import { useMatchDetailSheet } from '../context/MatchDetailSheetContext';
import type { MatchDetailData } from '../context/MatchDetailSheetContext';
import { useTranslation } from '../hooks';
import { PlayerInviteStep } from '../features/matches/components/PlayerInviteStep';

const BASE_WHITE = '#ffffff';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PlayerInviteSheet: React.FC = () => {
  const { sheetRef, closeSheet, inviteData } = usePlayerInviteSheet();
  const { updateSelectedMatch, selectedMatch } = useMatchDetailSheet();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  // Use the match query to get fresh data after invite
  // This query is automatically invalidated when useInviteToMatch succeeds
  const { refetch: refetchMatch } = useMatch(inviteData?.matchId, {
    enabled: !!inviteData?.matchId,
  });

  // Theme colors
  const themeColors = isDark ? darkTheme : lightTheme;
  const colors = useMemo(
    () => ({
      background: themeColors.card,
      cardBackground: themeColors.card,
      text: themeColors.foreground,
      textSecondary: isDark ? primary[300] : neutral[600],
      textMuted: themeColors.mutedForeground,
      border: themeColors.border,
      buttonActive: isDark ? primary[500] : primary[600],
      buttonInactive: themeColors.muted,
      buttonTextActive: BASE_WHITE,
    }),
    [themeColors, isDark]
  );

  // Single snap point at 95% to match MatchDetailSheet
  const snapPoints = useMemo(() => ['95%'], []);

  // Backdrop
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  // Handle complete - refetch match data and update context, then close the sheet
  const handleComplete = useCallback(async () => {
    // Refetch the match to get the updated participant list
    const result = await refetchMatch();
    // The refetch returns { data } which contains the match
    const freshMatch = result.data;
    if (freshMatch && selectedMatch) {
      // Update the selected match in context with fresh data
      // Preserve distance_meters from original as it's not in the query result
      updateSelectedMatch({
        ...freshMatch,
        distance_meters: selectedMatch.distance_meters,
      } as MatchDetailData);
    }
    closeSheet();
  }, [closeSheet, refetchMatch, selectedMatch, updateSelectedMatch]);

  // Handle close button press
  const handleClose = useCallback(() => {
    selectionHaptic();
    closeSheet();
  }, [closeSheet]);

  // Render nothing meaningful if no invite data
  if (!inviteData) {
    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        index={0}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: colors.border }]}
        backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.cardBackground }]}
      >
        {null}
      </BottomSheetModal>
    );
  }

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      index={0}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: colors.border }]}
      backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.cardBackground }]}
    >
      <View style={styles.container}>
        {/* Close button */}
        <View style={styles.closeButtonContainer}>
          <TouchableOpacity
            onPress={handleClose}
            style={[styles.closeButton, { backgroundColor: themeColors.muted }]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Player invite content */}
        <PlayerInviteStep
          matchId={inviteData.matchId}
          sportId={inviteData.sportId}
          hostId={inviteData.hostId}
          excludePlayerIds={inviteData.excludePlayerIds}
          onComplete={handleComplete}
          colors={colors}
          t={t}
          isDark={isDark}
          showSkip={false}
        />
      </View>
    </BottomSheetModal>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: radiusPixels['2xl'],
    borderTopRightRadius: radiusPixels['2xl'],
  },
  handleIndicator: {
    width: 40,
  },
  container: {
    flex: 1,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: spacingPixels[2],
    right: spacingPixels[4],
    zIndex: 10,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PlayerInviteSheet;
