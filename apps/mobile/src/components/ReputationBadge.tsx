/**
 * ReputationBadge Component
 *
 * Displays a player's reputation tier and score as a visual badge.
 * Adapts to different sizes and can show/hide the numeric score.
 *
 * @example
 * ```tsx
 * // Basic usage with hook
 * const { display } = usePlayerReputation(playerId);
 * <ReputationBadge
 *   tier={display.tier}
 *   score={display.score}
 *   isVisible={display.isVisible}
 * />
 *
 * // Compact version for lists
 * <ReputationBadge tier="gold" score={87} isVisible size="sm" />
 *
 * // Full version for profiles
 * <ReputationBadge tier="platinum" score={95} isVisible size="lg" showScore />
 * ```
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import type { ReputationTier } from '@rallia/shared-services';
import { useTranslation } from '../hooks';

// =============================================================================
// TYPES
// =============================================================================

export interface ReputationBadgeProps {
  /**
   * The reputation tier to display
   */
  tier: ReputationTier;

  /**
   * The numeric score (0-100)
   */
  score: number;

  /**
   * Whether the reputation is public (enough events completed)
   */
  isVisible: boolean;

  /**
   * Badge size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether to show the numeric score
   * @default false for sm/md, true for lg
   */
  showScore?: boolean;

  /**
   * Whether to show the tier label
   * @default false for sm, true for md/lg
   */
  showLabel?: boolean;

  /**
   * Layout direction
   * @default 'horizontal'
   */
  layout?: 'horizontal' | 'vertical';

  /**
   * Additional style overrides
   */
  style?: ViewStyle;

  /**
   * Test ID for testing
   */
  testID?: string;
}

// =============================================================================
// TIER STYLING
// =============================================================================

interface TierStyle {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TIER_STYLES: Record<ReputationTier, TierStyle> = {
  unknown: {
    primaryColor: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    textColor: '#6B7280',
    icon: 'help-circle',
  },
  bronze: {
    primaryColor: '#CD7F32',
    backgroundColor: '#FEF3C7',
    textColor: '#92400E',
    icon: 'shield',
  },
  silver: {
    primaryColor: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    textColor: '#374151',
    icon: 'shield',
  },
  gold: {
    primaryColor: '#F59E0B',
    backgroundColor: '#FEF9C3',
    textColor: '#854D0E',
    icon: 'shield',
  },
  platinum: {
    primaryColor: '#8B5CF6',
    backgroundColor: '#EDE9FE',
    textColor: '#5B21B6',
    icon: 'ribbon',
  },
};

// =============================================================================
// SIZE CONFIG
// =============================================================================

interface SizeConfig {
  iconSize: number;
  fontSize: number;
  scoreFontSize: number;
  paddingHorizontal: number;
  paddingVertical: number;
  gap: number;
}

const SIZE_CONFIGS: Record<'sm' | 'md' | 'lg', SizeConfig> = {
  sm: {
    iconSize: 14,
    fontSize: 10,
    scoreFontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 2,
  },
  md: {
    iconSize: 18,
    fontSize: 12,
    scoreFontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  lg: {
    iconSize: 24,
    fontSize: 14,
    scoreFontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const ReputationBadge: React.FC<ReputationBadgeProps> = ({
  tier,
  score,
  isVisible,
  size = 'md',
  showScore,
  showLabel,
  layout = 'horizontal',
  style,
  testID = 'reputation-badge',
}) => {
  const { t } = useTranslation();
  const tierStyle = TIER_STYLES[tier];
  const sizeConfig = SIZE_CONFIGS[size];

  // Default visibility based on size
  const shouldShowScore = showScore ?? size === 'lg';
  const shouldShowLabel = showLabel ?? size !== 'sm';

  // Get translated tier label
  const tierLabel = t(`reputation.tiers.${tier}`);

  // Container style
  const containerStyle: ViewStyle = {
    flexDirection: layout === 'horizontal' ? 'row' : 'column',
    alignItems: 'center',
    backgroundColor: tierStyle.backgroundColor,
    paddingHorizontal: sizeConfig.paddingHorizontal,
    paddingVertical: sizeConfig.paddingVertical,
    borderRadius: 999,
    gap: sizeConfig.gap,
  };

  // Text styles
  const labelStyle: TextStyle = {
    fontSize: sizeConfig.fontSize,
    fontWeight: '600',
    color: tierStyle.textColor,
  };

  const scoreStyle: TextStyle = {
    fontSize: sizeConfig.scoreFontSize,
    fontWeight: '500',
    color: tierStyle.textColor,
    opacity: 0.8,
  };

  // For hidden reputation (new players)
  if (!isVisible) {
    return (
      <View style={[containerStyle, style]} testID={testID}>
        <Ionicons
          name="help-circle-outline"
          size={sizeConfig.iconSize}
          color={TIER_STYLES.unknown.primaryColor}
        />
        {shouldShowLabel && <Text style={labelStyle}>{t('reputation.tiers.unknown')}</Text>}
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]} testID={testID}>
      <Ionicons name={tierStyle.icon} size={sizeConfig.iconSize} color={tierStyle.primaryColor} />
      {shouldShowLabel && <Text style={labelStyle}>{tierLabel}</Text>}
      {shouldShowScore && <Text style={scoreStyle}>{Math.round(score)}%</Text>}
    </View>
  );
};

// =============================================================================
// ICON ONLY VARIANT
// =============================================================================

export interface ReputationIconProps {
  /**
   * The reputation tier
   */
  tier: ReputationTier;

  /**
   * Whether visible
   */
  isVisible: boolean;

  /**
   * Icon size
   * @default 20
   */
  size?: number;

  /**
   * Additional style
   */
  style?: ViewStyle;

  /**
   * Test ID
   */
  testID?: string;
}

/**
 * Minimal icon-only reputation indicator.
 * Useful for tight spaces like table rows.
 */
export const ReputationIcon: React.FC<ReputationIconProps> = ({
  tier,
  isVisible,
  size = 20,
  style,
  testID = 'reputation-icon',
}) => {
  if (!isVisible) {
    return (
      <View style={style} testID={testID}>
        <Ionicons name="help-circle-outline" size={size} color={TIER_STYLES.unknown.primaryColor} />
      </View>
    );
  }

  const tierStyle = TIER_STYLES[tier];

  return (
    <View style={style} testID={testID}>
      <Ionicons name={tierStyle.icon} size={size} color={tierStyle.primaryColor} />
    </View>
  );
};

// =============================================================================
// INLINE VARIANT
// =============================================================================

export interface ReputationInlineProps {
  /**
   * The reputation tier
   */
  tier: ReputationTier;

  /**
   * The numeric score
   */
  score: number;

  /**
   * Whether visible
   */
  isVisible: boolean;

  /**
   * Additional style
   */
  style?: ViewStyle;

  /**
   * Test ID
   */
  testID?: string;
}

/**
 * Inline reputation display for text contexts.
 * Shows "Gold 87%" or "New Player" inline.
 */
export const ReputationInline: React.FC<ReputationInlineProps> = ({
  tier,
  score,
  isVisible,
  style,
  testID = 'reputation-inline',
}) => {
  const { t } = useTranslation();

  if (!isVisible) {
    return (
      <View style={[styles.inlineContainer, style]} testID={testID}>
        <Ionicons name="help-circle-outline" size={14} color={TIER_STYLES.unknown.primaryColor} />
        <Text style={[styles.inlineText, { color: TIER_STYLES.unknown.textColor }]}>
          {t('reputation.labels.newPlayer')}
        </Text>
      </View>
    );
  }

  const tierStyle = TIER_STYLES[tier];
  const tierLabel = t(`reputation.tiers.${tier}`);

  return (
    <View style={[styles.inlineContainer, style]} testID={testID}>
      <Ionicons name={tierStyle.icon} size={14} color={tierStyle.primaryColor} />
      <Text style={[styles.inlineText, { color: tierStyle.textColor }]}>
        {tierLabel} {Math.round(score)}%
      </Text>
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default ReputationBadge;
