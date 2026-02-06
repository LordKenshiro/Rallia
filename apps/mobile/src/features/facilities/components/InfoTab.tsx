/**
 * InfoTab Component
 * Displays facility basic info, address, contacts, and courts list.
 * Uses a flat layout with section headers consistent with other tabs.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Text, Skeleton, useToast } from '@rallia/shared-components';
import {
  spacingPixels,
  radiusPixels,
  primary,
  secondary,
  accent,
  neutral,
  status,
} from '@rallia/design-system';
import type { Court, FacilityContact, Facility } from '@rallia/shared-types';
import type { FacilityWithDetails } from '@rallia/shared-services';
import { lightHaptic } from '@rallia/shared-utils';
import type { TranslationKey, TranslationOptions } from '../../../hooks';
import { useSport } from '../../../context';
import { SportIcon } from '../../../components/SportIcon';

import CourtCard from './CourtCard';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =============================================================================
// TYPES
// =============================================================================

interface InfoTabProps {
  facility: FacilityWithDetails;
  courts: Court[];
  contacts: FacilityContact[];
  onOpenInMaps: () => void;
  colors: {
    card: string;
    cardForeground: string;
    text: string;
    textMuted: string;
    primary: string;
    border: string;
    background: string;
  };
  isDark: boolean;
  t: (key: TranslationKey, options?: TranslationOptions) => string;
  isLoading?: boolean;
}

interface SectionHeaderProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  badge?: string | number;
  colors: InfoTabProps['colors'];
  isDark: boolean;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format distance in meters to human-readable string
 */
function formatDistance(meters: number | null | undefined): string | null {
  if (meters == null) return null;
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format facility type to display label
 */
function formatFacilityType(type: Facility['facility_type'], t: InfoTabProps['t']): string | null {
  if (!type) return null;
  const key = `facilityDetail.facilityTypes.${type}` as Parameters<typeof t>[0];
  return t(key);
}

/**
 * Build full address string
 */
function buildFullAddress(facility: FacilityWithDetails): string | null {
  const parts: string[] = [];
  const data = facility.facilityData;
  const address = facility.address || data?.address;

  if (address) parts.push(address);
  if (data?.city) parts.push(data.city);
  if (data?.postal_code) parts.push(data.postal_code);

  return parts.length > 0 ? parts.join(', ') : null;
}

// =============================================================================
// SECTION HEADER COMPONENT
// =============================================================================

function SectionHeader({ title, icon, iconColor, badge, colors, isDark }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconWrapper, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.sectionHeaderText}>
        <Text size="sm" weight="semibold" color={colors.text}>
          {title}
        </Text>
      </View>
      {badge !== undefined && (
        <View
          style={[styles.sectionBadge, { backgroundColor: isDark ? neutral[700] : primary[50] }]}
        >
          <Text size="xs" weight="semibold" color={colors.primary}>
            {badge}
          </Text>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// SKELETON LOADER
// =============================================================================

function InfoTabSkeleton({
  colors: _colors,
  isDark,
}: {
  colors: InfoTabProps['colors'];
  isDark: boolean;
}) {
  const bgColor = isDark ? neutral[800] : '#E1E9EE';
  const highlightColor = isDark ? neutral[700] : '#F2F8FC';

  return (
    <View style={styles.skeletonContainer}>
      {/* About section skeleton */}
      <View style={styles.skeletonSection}>
        <View style={styles.skeletonSectionHeader}>
          <Skeleton
            width={32}
            height={32}
            backgroundColor={bgColor}
            highlightColor={highlightColor}
            style={{ borderRadius: radiusPixels.md }}
          />
          <Skeleton
            width={100}
            height={14}
            backgroundColor={bgColor}
            highlightColor={highlightColor}
            style={{ borderRadius: radiusPixels.sm }}
          />
        </View>
        <View style={styles.skeletonContent}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.skeletonBadgesRow}
          >
            {[1, 2].map(i => (
              <Skeleton
                key={i}
                width={100}
                height={28}
                backgroundColor={bgColor}
                highlightColor={highlightColor}
                style={{ borderRadius: radiusPixels.full }}
              />
            ))}
          </ScrollView>
          <View style={{ gap: spacingPixels[1] }}>
            <Skeleton
              width="100%"
              height={14}
              backgroundColor={bgColor}
              highlightColor={highlightColor}
            />
            <Skeleton
              width="80%"
              height={14}
              backgroundColor={bgColor}
              highlightColor={highlightColor}
            />
          </View>
        </View>
      </View>

      {/* Location section skeleton */}
      <View style={styles.skeletonSection}>
        <View style={styles.skeletonSectionHeader}>
          <Skeleton
            width={32}
            height={32}
            backgroundColor={bgColor}
            highlightColor={highlightColor}
            style={{ borderRadius: radiusPixels.md }}
          />
          <Skeleton
            width={140}
            height={14}
            backgroundColor={bgColor}
            highlightColor={highlightColor}
            style={{ borderRadius: radiusPixels.sm }}
          />
        </View>
        <View style={styles.skeletonContent}>
          <Skeleton
            width="90%"
            height={16}
            backgroundColor={bgColor}
            highlightColor={highlightColor}
          />
          <Skeleton
            width={100}
            height={12}
            backgroundColor={bgColor}
            highlightColor={highlightColor}
          />
          <Skeleton
            width="100%"
            height={44}
            borderRadius={12}
            backgroundColor={bgColor}
            highlightColor={highlightColor}
          />
          <View style={{ flexDirection: 'row', gap: spacingPixels[2] }}>
            {[1, 2, 3].map(i => (
              <Skeleton
                key={i}
                width={44}
                height={44}
                circle
                backgroundColor={bgColor}
                highlightColor={highlightColor}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Courts section skeleton */}
      <View style={styles.skeletonSection}>
        <View style={styles.skeletonSectionHeader}>
          <Skeleton
            width={32}
            height={32}
            backgroundColor={bgColor}
            highlightColor={highlightColor}
            style={{ borderRadius: radiusPixels.md }}
          />
          <Skeleton
            width={80}
            height={14}
            backgroundColor={bgColor}
            highlightColor={highlightColor}
            style={{ borderRadius: radiusPixels.sm }}
          />
          <Skeleton
            width={24}
            height={20}
            backgroundColor={bgColor}
            highlightColor={highlightColor}
            style={{ borderRadius: radiusPixels.full }}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.skeletonCourtsRow}
        >
          {[1, 2, 3].map(i => (
            <Skeleton
              key={i}
              width={160}
              height={100}
              borderRadius={12}
              backgroundColor={bgColor}
              highlightColor={highlightColor}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function InfoTab({
  facility,
  courts,
  contacts,
  onOpenInMaps,
  colors,
  isDark,
  t,
  isLoading = false,
}: InfoTabProps) {
  const toast = useToast();
  const { selectedSport } = useSport();
  const [showAllCourts, setShowAllCourts] = useState(false);

  // Facility data from facilityData (full record)
  const facilityData = facility.facilityData;

  // Build full address
  const fullAddress = buildFullAddress(facility);

  // Format distance
  const distanceDisplay = formatDistance(facility.distance_meters);

  // Get primary contact
  const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
  const website = primaryContact?.website;
  const phone = primaryContact?.phone;
  const email = primaryContact?.email;

  // Check if there's any contact info
  const hasContactInfo = phone || email || website;

  // Facility type and membership
  const facilityType = formatFacilityType(facilityData?.facility_type, t);
  const membershipRequired = facilityData?.membership_required;

  // Description
  const description = facilityData?.description;

  // Courts to display (limited or all)
  const COURTS_PREVIEW_LIMIT = 4;
  const displayedCourts = showAllCourts ? courts : courts.slice(0, COURTS_PREVIEW_LIMIT);
  const hasMoreCourts = courts.length > COURTS_PREVIEW_LIMIT;

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleCall = useCallback(() => {
    if (!phone) return;
    lightHaptic();
    Linking.openURL(`tel:${phone}`);
  }, [phone]);

  const handleEmail = useCallback(() => {
    if (!email) return;
    lightHaptic();
    Linking.openURL(`mailto:${email}`);
  }, [email]);

  const handleWebsite = useCallback(() => {
    if (!website) return;
    lightHaptic();
    Linking.openURL(website);
  }, [website]);

  const handleCopyAddress = useCallback(async () => {
    if (!fullAddress) return;
    lightHaptic();
    try {
      await Clipboard.setStringAsync(fullAddress);
      toast.success(t('facilityDetail.copied'));
    } catch {
      // Silently fail
    }
  }, [fullAddress, t, toast]);

  const handleCopyPhone = useCallback(async () => {
    if (!phone) return;
    lightHaptic();
    try {
      await Clipboard.setStringAsync(phone);
      toast.success(t('facilityDetail.copied'));
    } catch {
      // Silently fail
    }
  }, [phone, t, toast]);

  const handleToggleShowAllCourts = useCallback(() => {
    lightHaptic();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAllCourts(!showAllCourts);
  }, [showAllCourts]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (isLoading) {
    return <InfoTabSkeleton colors={colors} isDark={isDark} />;
  }

  return (
    <View style={styles.container}>
      {/* About Section */}
      {(description || facilityType || membershipRequired !== undefined) && (
        <View style={styles.section}>
          <SectionHeader
            title={t('facilityDetail.about')}
            icon="information-circle"
            iconColor={colors.primary}
            colors={colors}
            isDark={isDark}
          />

          {/* Badges row - horizontal scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesScrollContent}
          >
            {facilityType && (
              <View
                style={[styles.typeBadge, { backgroundColor: isDark ? neutral[700] : primary[50] }]}
              >
                <Ionicons name="business-outline" size={12} color={colors.primary} />
                <Text size="xs" weight="medium" color={colors.primary}>
                  {facilityType}
                </Text>
              </View>
            )}
            {membershipRequired !== undefined && (
              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor: isDark
                      ? neutral[700]
                      : membershipRequired
                        ? accent[500] + '15'
                        : status.success.DEFAULT + '15',
                  },
                ]}
              >
                <Ionicons
                  name={membershipRequired ? 'lock-closed' : 'lock-open'}
                  size={12}
                  color={membershipRequired ? accent[600] : status.success.DEFAULT}
                />
                <Text
                  size="xs"
                  weight="medium"
                  color={membershipRequired ? accent[600] : status.success.DEFAULT}
                >
                  {membershipRequired
                    ? t('facilityDetail.membersOnly')
                    : t('facilityDetail.publicAccess')}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Description */}
          {description && (
            <View style={styles.descriptionContainer}>
              <Text size="sm" color={colors.text} style={styles.descriptionText} numberOfLines={5}>
                {description}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Location & Contact Section */}
      <View style={styles.section}>
        <SectionHeader
          title={t('facilityDetail.locationContact')}
          icon="location"
          iconColor={secondary[500]}
          colors={colors}
          isDark={isDark}
        />

        {/* Address with copy */}
        {fullAddress && (
          <View style={styles.addressRow}>
            <View style={styles.addressContent}>
              <Text size="sm" weight="medium" color={colors.text} style={styles.addressText}>
                {fullAddress}
              </Text>
              {distanceDisplay && (
                <View style={styles.distanceRow}>
                  <Ionicons name="navigate-circle-outline" size={14} color={colors.textMuted} />
                  <Text size="xs" color={colors.textMuted}>
                    {t('facilityDetail.distanceAway', { distance: distanceDisplay })}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={handleCopyAddress}
              style={[styles.copyButton, { backgroundColor: isDark ? neutral[800] : primary[50] }]}
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Open in Maps button */}
        <View style={styles.mapsButtonContainer}>
          <TouchableOpacity
            onPress={onOpenInMaps}
            style={[styles.mapsButton, { backgroundColor: isDark ? neutral[700] : primary[50] }]}
            activeOpacity={0.7}
          >
            <Ionicons name="navigate-outline" size={16} color={colors.primary} />
            <Text size="sm" weight="semibold" color={colors.primary}>
              {t('facilityDetail.openInMaps')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions Row */}
        {hasContactInfo && (
          <View style={styles.quickActionsContainer}>
            <View style={styles.quickActionsRow}>
              {phone && (
                <TouchableOpacity
                  onPress={handleCall}
                  onLongPress={handleCopyPhone}
                  style={[styles.quickActionButton, { backgroundColor: primary[500] + '15' }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call-outline" size={20} color={primary[600]} />
                </TouchableOpacity>
              )}
              {email && (
                <TouchableOpacity
                  onPress={handleEmail}
                  style={[styles.quickActionButton, { backgroundColor: primary[500] + '15' }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mail-outline" size={20} color={primary[600]} />
                </TouchableOpacity>
              )}
              {website && (
                <TouchableOpacity
                  onPress={handleWebsite}
                  style={[styles.quickActionButton, { backgroundColor: primary[500] + '15' }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="globe-outline" size={20} color={primary[600]} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Courts Section */}
      <View style={styles.section}>
        <SectionHeader
          title={t('facilityDetail.courts')}
          icon="grid"
          iconColor={primary[500]}
          badge={courts.length}
          colors={colors}
          isDark={isDark}
        />

        {courts.length === 0 ? (
          <View style={styles.emptyState}>
            <SportIcon
              sportName={selectedSport?.name ?? 'tennis'}
              size={32}
              color={colors.textMuted}
            />
            <Text size="sm" color={colors.textMuted} style={styles.emptyStateText}>
              {t('facilityDetail.noCourts')}
            </Text>
          </View>
        ) : (
          <>
            {/* Horizontal scroll for courts */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.courtsScrollContent}
            >
              {displayedCourts.map(court => (
                <View key={court.id} style={styles.courtCardWrapper}>
                  <CourtCard court={court} colors={colors} isDark={isDark} t={t} />
                </View>
              ))}
            </ScrollView>

            {/* Show all / Hide toggle */}
            {hasMoreCourts && (
              <View style={styles.showAllContainer}>
                <TouchableOpacity
                  onPress={handleToggleShowAllCourts}
                  style={[
                    styles.showAllButton,
                    { backgroundColor: isDark ? neutral[800] : primary[50] },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text size="sm" weight="medium" color={colors.primary}>
                    {showAllCourts
                      ? t('facilityDetail.hideCourts')
                      : t('facilityDetail.showAllCourts', { count: courts.length })}
                  </Text>
                  <Ionicons
                    name={showAllCourts ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    gap: spacingPixels[4],
    paddingBottom: spacingPixels[4],
  },

  // Section (flat layout)
  section: {
    gap: spacingPixels[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2.5],
    paddingHorizontal: spacingPixels[4],
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: radiusPixels.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionBadge: {
    paddingHorizontal: spacingPixels[2.5],
    paddingVertical: spacingPixels[1],
    borderRadius: radiusPixels.full,
  },

  // About Section
  badgesScrollContent: {
    paddingHorizontal: spacingPixels[4],
    gap: spacingPixels[2],
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[1],
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[2],
    borderRadius: radiusPixels.full,
  },
  descriptionContainer: {
    paddingHorizontal: spacingPixels[4],
  },
  descriptionText: {
    lineHeight: 22,
  },

  // Location Section
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacingPixels[2],
    paddingHorizontal: spacingPixels[4],
  },
  addressContent: {
    flex: 1,
  },
  addressText: {
    lineHeight: 22,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[1],
    marginTop: spacingPixels[1],
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: radiusPixels.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapsButtonContainer: {
    paddingHorizontal: spacingPixels[4],
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacingPixels[2],
    paddingVertical: spacingPixels[3],
    borderRadius: radiusPixels.lg,
  },

  // Quick Actions
  quickActionsContainer: {
    paddingHorizontal: spacingPixels[4],
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacingPixels[2],
  },
  quickActionButton: {
    width: 44,
    height: 44,
    borderRadius: radiusPixels.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Courts Section
  courtsScrollContent: {
    paddingHorizontal: spacingPixels[4],
    gap: spacingPixels[2.5],
  },
  courtCardWrapper: {
    width: 180,
  },
  emptyState: {
    paddingVertical: spacingPixels[6],
    paddingHorizontal: spacingPixels[4],
    alignItems: 'center',
    gap: spacingPixels[2],
  },
  emptyStateText: {
    textAlign: 'center',
  },
  showAllContainer: {
    paddingHorizontal: spacingPixels[4],
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacingPixels[1],
    paddingVertical: spacingPixels[2.5],
    borderRadius: radiusPixels.lg,
  },

  // Skeleton loading
  skeletonContainer: {
    padding: spacingPixels[2],
    gap: spacingPixels[4],
  },
  skeletonSection: {
    gap: spacingPixels[3],
  },
  skeletonSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2.5],
    paddingHorizontal: spacingPixels[4],
  },
  skeletonContent: {
    paddingHorizontal: spacingPixels[4],
    gap: spacingPixels[2],
  },
  skeletonBadgesRow: {
    gap: spacingPixels[2],
  },
  skeletonCourtsRow: {
    paddingHorizontal: spacingPixels[4],
    gap: spacingPixels[2.5],
  },
});
