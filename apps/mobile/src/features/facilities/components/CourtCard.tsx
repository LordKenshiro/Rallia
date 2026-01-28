/**
 * CourtCard Component
 * Displays a court's information including surface type, indoor/outdoor, lighting.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import {
  spacingPixels,
  radiusPixels,
  shadowsNative,
  primary,
  accent,
  neutral,
} from '@rallia/design-system';
import type { Court } from '@rallia/shared-types';
import type { TranslationKey, TranslationOptions } from '../../../hooks';

interface CourtCardProps {
  court: Court;
  colors: {
    card: string;
    text: string;
    textMuted: string;
    primary: string;
    border: string;
  };
  isDark: boolean;
  t: (key: TranslationKey, options?: TranslationOptions) => string;
}

// Surface type icons
const SURFACE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  hard: 'square',
  clay: 'leaf',
  grass: 'flower',
  carpet: 'grid',
  acrylic: 'ellipse',
  synthetic: 'shapes',
};

export default function CourtCard({ court, colors, isDark, t }: CourtCardProps) {
  // Format court name
  const courtName = court.name || `Court ${court.court_number || ''}`;

  // Format surface type
  const surfaceType = court.surface_type?.toLowerCase() || '';
  const surfaceLabel = court.surface_type
    ? court.surface_type.charAt(0).toUpperCase() + court.surface_type.slice(1).replace('_', ' ')
    : null;
  const surfaceIcon = SURFACE_ICONS[surfaceType] || 'layers';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card },
        isDark ? shadowsNative.sm : shadowsNative.DEFAULT,
      ]}
    >
      {/* Header row with court name only */}
      <View style={styles.header}>
        <View style={[styles.courtIcon, { backgroundColor: primary[500] + '15' }]}>
          <Ionicons name="tennisball" size={16} color={colors.primary} />
        </View>
        <Text size="sm" weight="bold" color={colors.text} style={styles.courtName}>
          {courtName}
        </Text>
      </View>

      {/* Attribute badges */}
      <View style={styles.badges}>
        {/* Indoor/Outdoor badge - uses primary for indoor, accent for outdoor */}
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isDark
                ? neutral[700]
                : court.indoor
                  ? primary[500] + '15'
                  : accent[500] + '15',
            },
          ]}
        >
          <Ionicons
            name={court.indoor ? 'home' : 'sunny'}
            size={12}
            color={court.indoor ? primary[500] : accent[500]}
          />
          <Text size="xs" weight="medium" color={court.indoor ? primary[500] : accent[500]}>
            {court.indoor ? t('facilityDetail.indoor') : t('facilityDetail.outdoor')}
          </Text>
        </View>

        {/* Lighting badge - uses accent (yellow/gold for light) */}
        {court.lighting && (
          <View
            style={[styles.badge, { backgroundColor: isDark ? neutral[700] : accent[500] + '15' }]}
          >
            <Ionicons name="bulb" size={12} color={accent[600]} />
            <Text size="xs" weight="medium" color={accent[600]}>
              {t('facilityDetail.lighted')}
            </Text>
          </View>
        )}

        {/* Surface type badge - uses primary color */}
        {surfaceLabel && (
          <View
            style={[styles.badge, { backgroundColor: isDark ? neutral[700] : primary[500] + '15' }]}
          >
            <Ionicons name={surfaceIcon} size={12} color={primary[600]} />
            <Text size="xs" weight="medium" color={primary[600]}>
              {surfaceLabel}
            </Text>
          </View>
        )}

        {/* Multi-sport badge - uses primary color */}
        {court.lines_marked_for_multiple_sports && (
          <View
            style={[styles.badge, { backgroundColor: isDark ? neutral[700] : primary[500] + '15' }]}
          >
            <Ionicons name="fitness" size={12} color={primary[600]} />
            <Text size="xs" weight="medium" color={primary[600]}>
              {t('facilityDetail.multiSport')}
            </Text>
          </View>
        )}
      </View>

      {/* Court notes */}
      {court.notes && (
        <View style={styles.notesContainer}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <Text size="xs" color={colors.textMuted} style={styles.notesText}>
            {court.notes}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacingPixels[3],
    borderRadius: radiusPixels.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2],
    marginBottom: spacingPixels[2],
  },
  courtIcon: {
    width: 32,
    height: 32,
    borderRadius: radiusPixels.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courtName: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingPixels[1.5],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[1],
    paddingHorizontal: spacingPixels[2],
    paddingVertical: spacingPixels[1],
    borderRadius: radiusPixels.full,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacingPixels[1.5],
    marginTop: spacingPixels[2],
    paddingTop: spacingPixels[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  notesText: {
    flex: 1,
    lineHeight: 18,
  },
});
