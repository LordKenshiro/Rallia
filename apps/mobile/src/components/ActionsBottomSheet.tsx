/**
 * Actions Bottom Sheet - Main action sheet for the app
 *
 * This bottom sheet opens when the center tab button is pressed.
 * It displays different content based on authentication state:
 * - Guest: Auth form to sign in/sign up
 * - Authenticated (not onboarded): Continue onboarding
 * - Onboarded: Actions wizard for creating matches, groups, etc.
 */

import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import {
  lightTheme,
  darkTheme,
  spacingPixels,
  radiusPixels,
  fontSizePixels,
  primary,
  neutral,
  base,
} from '@rallia/design-system';
import { lightHaptic } from '@rallia/shared-utils';
import { useActionsSheet, useOverlay } from '../context';
import { useAuth, useTranslation, type TranslationKey } from '../hooks';
import { useTheme } from '../hooks/useTheme';

// =============================================================================
// TYPES
// =============================================================================

interface ThemeColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  icon: string;
  iconMuted: string;
  buttonActive: string;
  buttonInactive: string;
  buttonTextActive: string;
  buttonTextInactive: string;
}

// =============================================================================
// CONTENT COMPONENTS
// =============================================================================

/**
 * Auth content - Shown to guests
 */
interface AuthContentProps {
  onSignIn: () => void;
  onSignUp: () => void;
  colors: ThemeColors;
  t: (key: TranslationKey) => string;
}

const AuthContent: React.FC<AuthContentProps> = ({ onSignIn, onSignUp, colors, t }) => {
  return (
    <View style={styles.contentContainer}>
      <View style={styles.header}>
        <Ionicons name="person-circle-outline" size={64} color={colors.buttonActive} />
        <Text size="2xl" weight="bold" color={colors.text} style={styles.title}>
          {t('actions.welcome')}
        </Text>
        <Text size="base" color={colors.textSecondary} style={styles.subtitle}>
          {t('actions.welcomeSubtitle')}
        </Text>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.buttonActive }]}
          onPress={() => {
            lightHaptic();
            onSignUp();
          }}
          activeOpacity={0.7}
        >
          <Text size="lg" weight="semibold" color={colors.buttonTextActive}>
            {t('auth.signUp')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: colors.buttonInactive }]}
          onPress={() => {
            lightHaptic();
            onSignIn();
          }}
          activeOpacity={0.7}
        >
          <Text size="lg" weight="semibold" color={colors.buttonActive}>
            {t('auth.signIn')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Onboarding content - Shown to authenticated users who haven't completed onboarding
 */
interface OnboardingContentProps {
  onContinue: () => void;
  colors: ThemeColors;
  t: (key: TranslationKey) => string;
}

const OnboardingContent: React.FC<OnboardingContentProps> = ({ onContinue, colors, t }) => {
  return (
    <View style={styles.contentContainer}>
      <View style={styles.header}>
        <Ionicons name="rocket-outline" size={64} color={colors.buttonActive} />
        <Text size="2xl" weight="bold" color={colors.text} style={styles.title}>
          {t('actions.completeProfile')}
        </Text>
        <Text size="base" color={colors.textSecondary} style={styles.subtitle}>
          {t('actions.completeProfileSubtitle')}
        </Text>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.buttonActive }]}
          onPress={() => {
            lightHaptic();
            onContinue();
          }}
          activeOpacity={0.7}
        >
          <Text size="lg" weight="semibold" color={colors.buttonTextActive}>
            {t('actions.continueSetup')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Action item for the actions wizard
 */
interface ActionItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  colors: ThemeColors;
}

const ActionItem: React.FC<ActionItemProps> = ({ icon, title, description, onPress, colors }) => {
  return (
    <TouchableOpacity
      style={[styles.actionItem, { borderBottomColor: colors.border }]}
      onPress={() => {
        lightHaptic();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIconContainer, { backgroundColor: colors.buttonInactive }]}>
        <Ionicons name={icon} size={24} color={colors.buttonActive} />
      </View>
      <View style={styles.actionTextContainer}>
        <Text size="base" weight="semibold" color={colors.text}>
          {title}
        </Text>
        <Text size="sm" color={colors.textMuted} style={styles.actionDescription}>
          {description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.iconMuted} />
    </TouchableOpacity>
  );
};

/**
 * Actions wizard content - Shown to fully onboarded users
 */
interface ActionsContentProps {
  onClose: () => void;
  colors: ThemeColors;
  t: (key: TranslationKey) => string;
}

const ActionsContent: React.FC<ActionsContentProps> = ({ onClose, colors, t }) => {
  const handleCreateMatch = () => {
    // TODO: Navigate to create match flow
    onClose();
  };

  const handleInvitePlayers = () => {
    // TODO: Navigate to invite players flow
    onClose();
  };

  const handleCreateShareList = () => {
    // TODO: Navigate to create share list flow
    onClose();
  };

  const handleCreateGroup = () => {
    // TODO: Navigate to create group flow
    onClose();
  };

  const handleCreateCommunity = () => {
    // TODO: Navigate to create community flow
    onClose();
  };

  const handleCreateTournament = () => {
    // TODO: Navigate to create tournament flow
    onClose();
  };

  const handleCreateLeague = () => {
    // TODO: Navigate to create league flow
    onClose();
  };

  return (
    <View style={styles.contentContainer}>
      <View style={[styles.wizardHeader, { borderBottomColor: colors.border }]}>
        <Text size="xl" weight="bold" color={colors.text}>
          {t('actions.quickActions')}
        </Text>
      </View>

      <View style={styles.actionsList}>
        <ActionItem
          icon="tennisball-outline"
          title={t('actions.createMatch')}
          description={t('actions.createMatchDescription')}
          onPress={handleCreateMatch}
          colors={colors}
        />

        <ActionItem
          icon="person-add-outline"
          title={t('actions.invitePlayers')}
          description={t('actions.invitePlayersDescription')}
          onPress={handleInvitePlayers}
          colors={colors}
        />

        <ActionItem
          icon="share-outline"
          title={t('actions.createShareList')}
          description={t('actions.createShareListDescription')}
          onPress={handleCreateShareList}
          colors={colors}
        />

        <ActionItem
          icon="people-outline"
          title={t('actions.createGroup')}
          description={t('actions.createGroupDescription')}
          onPress={handleCreateGroup}
          colors={colors}
        />

        <ActionItem
          icon="people-outline"
          title={t('actions.createCommunity')}
          description={t('actions.createCommunityDescription')}
          onPress={handleCreateCommunity}
          colors={colors}
        />

        <ActionItem
          icon="trophy-outline"
          title={t('actions.createTournament')}
          description={t('actions.createTournamentDescription')}
          onPress={handleCreateTournament}
          colors={colors}
        />

        <ActionItem
          icon="trophy-outline"
          title={t('actions.createLeague')}
          description={t('actions.createLeagueDescription')}
          onPress={handleCreateLeague}
          colors={colors}
        />
      </View>
    </View>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.9; // 90% of screen height

export const ActionsBottomSheet: React.FC = () => {
  const { sheetRef, closeSheet } = useActionsSheet();
  const { session } = useAuth();
  const { needsOnboarding, startOnboarding, startLogin, resumeOnboarding } = useOverlay();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  // Theme-aware colors from design system
  const themeColors = isDark ? darkTheme : lightTheme;
  const colors = useMemo<ThemeColors>(
    () => ({
      background: themeColors.background,
      cardBackground: themeColors.card,
      text: themeColors.foreground,
      textSecondary: isDark ? primary[300] : neutral[600],
      textMuted: themeColors.mutedForeground,
      border: themeColors.border,
      icon: themeColors.foreground,
      iconMuted: themeColors.mutedForeground,
      buttonInactive: themeColors.muted,
      buttonActive: isDark ? primary[500] : primary[600],
      buttonTextInactive: themeColors.mutedForeground,
      buttonTextActive: base.white,
    }),
    [themeColors, isDark]
  );

  // Custom backdrop with opacity
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  // Handle sign in action
  const handleSignIn = useCallback(() => {
    closeSheet();
    startLogin();
  }, [closeSheet, startLogin]);

  // Handle sign up action
  const handleSignUp = useCallback(() => {
    closeSheet();
    startOnboarding();
  }, [closeSheet, startOnboarding]);

  // Handle continue onboarding action
  const handleContinueOnboarding = useCallback(() => {
    closeSheet();
    resumeOnboarding();
  }, [closeSheet, resumeOnboarding]);

  // Determine which content to show
  const renderContent = () => {
    // Guest user - show auth options
    if (!session?.user) {
      return <AuthContent onSignIn={handleSignIn} onSignUp={handleSignUp} colors={colors} t={t} />;
    }

    // Authenticated but not onboarded - show continue onboarding
    if (needsOnboarding) {
      return <OnboardingContent onContinue={handleContinueOnboarding} colors={colors} t={t} />;
    }

    // Fully onboarded - show actions wizard
    return <ActionsContent onClose={closeSheet} colors={colors} t={t} />;
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing={true}
      maxDynamicContentSize={MAX_SHEET_HEIGHT}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: colors.border }]}
      backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.cardBackground }]}
    >
      <BottomSheetScrollView style={styles.sheetContent}>{renderContent()}</BottomSheetScrollView>
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
    width: spacingPixels[10],
  },
  sheetContent: {
    flexGrow: 1,
  },
  contentContainer: {
    paddingHorizontal: spacingPixels[6],
    paddingTop: spacingPixels[2],
    paddingBottom: spacingPixels[8],
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacingPixels[6],
  },
  title: {
    marginTop: spacingPixels[4],
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacingPixels[2],
    textAlign: 'center',
  },
  buttonGroup: {
    gap: spacingPixels[3],
    paddingTop: spacingPixels[6],
  },
  primaryButton: {
    paddingVertical: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: spacingPixels[4],
    borderRadius: radiusPixels.lg,
    alignItems: 'center',
  },
  wizardHeader: {
    paddingVertical: spacingPixels[4],
    borderBottomWidth: 1,
  },
  actionsList: {
    paddingTop: spacingPixels[2],
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingPixels[4],
    borderBottomWidth: 1,
  },
  actionIconContainer: {
    width: spacingPixels[11],
    height: spacingPixels[11],
    borderRadius: radiusPixels.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextContainer: {
    flex: 1,
    marginLeft: spacingPixels[3],
  },
  actionDescription: {
    marginTop: spacingPixels[0.5],
  },
});

export default ActionsBottomSheet;
