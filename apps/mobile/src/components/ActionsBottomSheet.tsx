/**
 * Actions Bottom Sheet - Main action sheet for the app
 *
 * This bottom sheet opens when the center tab button is pressed.
 * It displays different content based on authentication state:
 * - Guest: Auth form to sign in/sign up
 * - Authenticated (not onboarded): Continue onboarding
 * - Onboarded: Actions wizard for creating matches, groups, etc.
 *
 * When "Create Match" is pressed, the MatchCreationWizard slides in.
 */

import * as React from 'react';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Keyboard } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
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
import { lightHaptic, successHaptic } from '@rallia/shared-utils';
import { useActionsSheet, useOverlay } from '../context';
import { useAuth, useTranslation, type TranslationKey } from '../hooks';
import { useTheme } from '../hooks/useTheme';
import { MatchCreationWizard } from '../features/matches';

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
  onCreateMatch: () => void;
  colors: ThemeColors;
  t: (key: TranslationKey) => string;
}

const ActionsContent: React.FC<ActionsContentProps> = ({ onClose, onCreateMatch, colors, t }) => {
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
        <Text size="xl" weight="bold" color={colors.text} style={{ textAlign: 'center' }}>
          {t('actions.quickActions')}
        </Text>
      </View>

      <View style={styles.actionsList}>
        <ActionItem
          icon="tennisball-outline"
          title={t('actions.createMatch')}
          description={t('actions.createMatchDescription')}
          onPress={onCreateMatch}
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

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.9; // 90% of screen height

export const ActionsBottomSheet: React.FC = () => {
  const { sheetRef, closeSheet } = useActionsSheet();
  const { session } = useAuth();
  const { needsOnboarding, startOnboarding, startLogin, resumeOnboarding } = useOverlay();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);

  // Animation value for slide transition
  const slideProgress = useSharedValue(0);

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

  // Handle create match - show wizard with slide animation
  const handleCreateMatch = useCallback(() => {
    lightHaptic();
    setShowWizard(true);
    slideProgress.value = withSpring(1, { damping: 80, stiffness: 600, overshootClamping: false });
  }, [slideProgress]);

  // Handle wizard close - slide back to actions list
  const handleWizardClose = useCallback(() => {
    slideProgress.value = withSpring(0, { damping: 80, stiffness: 600, overshootClamping: false });
    // Wait for animation to complete before hiding wizard
    setTimeout(() => {
      setShowWizard(false);
    }, 300);
  }, [slideProgress]);

  // Handle wizard success
  const handleWizardSuccess = useCallback(
    (matchId: string) => {
      successHaptic();
      // Close the sheet and navigate to match detail
      closeSheet();
      setShowWizard(false);
      slideProgress.value = 0;
      // TODO: Navigate to match detail screen
      console.log('Match created:', matchId);
    },
    [closeSheet, slideProgress]
  );

  // Handle sheet dismiss - reset wizard state
  const handleSheetDismiss = useCallback(() => {
    setShowWizard(false);
    slideProgress.value = 0;
  }, [slideProgress]);

  // Handle keyboard dismissal to restore sheet position
  // This ensures the sheet restores when keyboard is dismissed by tapping outside
  useEffect(() => {
    if (!showWizard) return;

    let hideTimeout: NodeJS.Timeout;

    const handleKeyboardHide = () => {
      // Clear any pending timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }

      // Use a small delay to ensure keyboard is fully dismissed
      // and to avoid conflicts with bottom sheet's internal keyboard handling
      hideTimeout = setTimeout(() => {
        if (sheetRef.current) {
          try {
            sheetRef.current.snapToIndex(0);
          } catch (error) {
            // Silently handle any errors (e.g., if sheet is already at that position)
          }
        }
      }, 150);
    };

    const keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', handleKeyboardHide);
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);

    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
      keyboardWillHideListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [showWizard, sheetRef]);

  // Animated styles for content sliding
  const actionsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(slideProgress.value, [0, 1], [0, -SCREEN_WIDTH]),
      },
    ],
    opacity: interpolate(slideProgress.value, [0, 0.5, 1], [1, 0.5, 0]),
  }));

  const wizardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(slideProgress.value, [0, 1], [SCREEN_WIDTH, 0]),
      },
    ],
    opacity: interpolate(slideProgress.value, [0, 0.5, 1], [0, 0.5, 1]),
  }));

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

    // Fully onboarded - show actions wizard or match creation wizard
    return (
      <View style={styles.slidingContainer}>
        {/* Actions list */}
        <Animated.View style={[styles.slidePanel, actionsAnimatedStyle]}>
          <ActionsContent
            onClose={closeSheet}
            onCreateMatch={handleCreateMatch}
            colors={colors}
            t={t}
          />
        </Animated.View>

        {/* Match creation wizard */}
        {showWizard && (
          <Animated.View style={[styles.slidePanel, styles.wizardPanel, wizardAnimatedStyle]}>
            <MatchCreationWizard
              onClose={closeSheet}
              onBackToLanding={handleWizardClose}
              onSuccess={handleWizardSuccess}
            />
          </Animated.View>
        )}
      </View>
    );
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing={!showWizard}
      snapPoints={showWizard ? ['90%'] : undefined}
      maxDynamicContentSize={MAX_SHEET_HEIGHT}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={!showWizard}
      handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: colors.border }]}
      backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.cardBackground }]}
      bottomInset={0}
      onDismiss={handleSheetDismiss}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      enableDismissOnClose
    >
      {showWizard ? (
        <BottomSheetView style={[styles.sheetContent, { backgroundColor: colors.cardBackground }]}>
          {renderContent()}
        </BottomSheetView>
      ) : (
        <BottomSheetScrollView
          style={[styles.sheetContent, { backgroundColor: colors.cardBackground }]}
        >
          {renderContent()}
        </BottomSheetScrollView>
      )}
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
  slidingContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  slidePanel: {
    width: '100%',
  },
  wizardPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
