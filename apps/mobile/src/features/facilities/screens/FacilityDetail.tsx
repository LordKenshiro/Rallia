/**
 * FacilityDetail Screen
 * Displays detailed facility information with three tabs:
 * - Info: Basic info, address, contacts, courts list
 * - Availability: Court availability and booking
 * - Matches: Public matches at this facility
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Linking,
  Platform,
  Animated,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, Skeleton, useToast } from '@rallia/shared-components';
import {
  useFacilityDetail,
  useFavoriteFacilities,
  usePlayer,
  useCourtAvailability,
} from '@rallia/shared-hooks';
import { useThemeStyles, useTranslation, useEffectiveLocation } from '../../../hooks';
import { getSafeAreaEdges } from '../../../utils';
import { useSport } from '../../../context';
import { useCourtsRoute } from '../../../navigation/hooks';
import {
  spacingPixels,
  radiusPixels,
  shadowsNative,
  primary,
  neutral,
} from '@rallia/design-system';
import { lightHaptic } from '@rallia/shared-utils';

// Tab components
import InfoTab from '../components/InfoTab';
import AvailabilityTab from '../components/AvailabilityTab';
import MatchesTab from '../components/MatchesTab';

// =============================================================================
// TYPES
// =============================================================================

type TabKey = 'info' | 'availability' | 'matches';
const TAB_KEYS: TabKey[] = ['info', 'availability', 'matches'];

const TAB_ICONS: Record<TabKey, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle-outline',
  availability: 'calendar-outline',
  matches: 'tennisball-outline',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function FacilityDetail() {
  const route = useCourtsRoute<'FacilityDetail'>();
  const { facilityId } = route.params;

  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();
  const toast = useToast();
  const { location } = useEffectiveLocation();
  const { selectedSport } = useSport();
  const { player } = usePlayer();

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabKey>('info');

  // Tab bar animation
  const tabIndicatorAnim = useMemo(() => new Animated.Value(0), []);
  const [tabWidths, setTabWidths] = useState<number[]>([]);
  const [tabPositions, setTabPositions] = useState<number[]>([]);

  // Fetch facility details
  const { facility, courts, contacts, isLoading, isFetching, refetch } = useFacilityDetail({
    facilityId,
    sportId: selectedSport?.id,
    latitude: location?.latitude,
    longitude: location?.longitude,
  });

  // Fetch availability for the facility
  const {
    slots: formattedSlots,
    isLoading: availabilityLoading,
    refetch: refetchAvailability,
  } = useCourtAvailability({
    facilityId,
    dataProviderId: facility?.data_provider_id ?? null,
    dataProviderType: facility?.data_provider_type ?? null,
    externalProviderId: facility?.external_provider_id ?? null,
    bookingUrlTemplate: facility?.booking_url_template ?? null,
    facilityTimezone: facility?.timezone ?? null,
    enabled: !!facility,
  });

  // Favorites management
  const { isFavorite, addFavorite, removeFavorite, isMaxReached } = useFavoriteFacilities(
    player?.id ?? null
  );

  const facilityIsFavorite = facility ? isFavorite(facility.id) : false;

  // Handle favorite toggle
  const handleToggleFavorite = useCallback(async () => {
    if (!facility || !player?.id) return;

    lightHaptic();

    if (facilityIsFavorite) {
      const success = await removeFavorite(facility.id);
      if (success) {
        toast.success(t('facilitiesTab.favorites.removedFromFavorites'));
      }
    } else {
      if (isMaxReached) {
        toast.info(t('facilitiesTab.favorites.maxReached'));
        return;
      }
      const success = await addFavorite(facility);
      if (success) {
        toast.success(t('facilitiesTab.favorites.addedToFavorites'));
      }
    }
  }, [
    facility,
    player?.id,
    facilityIsFavorite,
    removeFavorite,
    addFavorite,
    isMaxReached,
    t,
    toast,
  ]);

  // Animate tab indicator when tab changes
  const animateToTab = useCallback(
    (index: number) => {
      if (tabPositions.length === 0 || tabWidths.length === 0) return;

      Animated.spring(tabIndicatorAnim, {
        toValue: tabPositions[index] || 0,
        useNativeDriver: true,
        tension: 68,
        friction: 10,
      }).start();
    },
    [tabIndicatorAnim, tabPositions, tabWidths]
  );

  // Handle tab layout measurement
  const handleTabLayout = useCallback((index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabPositions(prev => {
      const newPositions = [...prev];
      newPositions[index] = x;
      return newPositions;
    });
    setTabWidths(prev => {
      const newWidths = [...prev];
      newWidths[index] = width;
      return newWidths;
    });
  }, []);

  // Animate to active tab when positions are ready
  useEffect(() => {
    const activeIndex = TAB_KEYS.indexOf(activeTab);
    animateToTab(activeIndex);
  }, [activeTab, tabPositions, animateToTab]);

  // Handle refresh (only for info and availability tabs - matches tab handles its own refresh)
  const handleRefresh = useCallback(() => {
    refetch();
    if (activeTab === 'availability') {
      refetchAvailability();
    }
  }, [activeTab, refetch, refetchAvailability]);

  // Handle opening address in maps
  const handleOpenInMaps = useCallback(() => {
    if (!facility?.facilityData) return;

    const address = facility.address || facility.facilityData.address;
    const lat = facility.facilityData.latitude;
    const lng = facility.facilityData.longitude;

    let url: string;
    if (lat && lng) {
      // Open with coordinates
      url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}`,
      }) as string;
    } else if (address) {
      // Open with address
      const encodedAddress = encodeURIComponent(address);
      url = Platform.select({
        ios: `maps:0,0?q=${encodedAddress}`,
        android: `geo:0,0?q=${encodedAddress}`,
      }) as string;
    } else {
      return;
    }

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      }
    });
  }, [facility]);

  // Render tab button
  const renderTabButton = useCallback(
    (tab: TabKey, index: number) => {
      const isActive = activeTab === tab;
      const tabLabel = t(`facilityDetail.tabs.${tab}` as Parameters<typeof t>[0]);
      const iconName = TAB_ICONS[tab];

      return (
        <TouchableOpacity
          key={tab}
          onPress={() => {
            lightHaptic();
            setActiveTab(tab);
          }}
          onLayout={e => handleTabLayout(index, e)}
          style={styles.tabButton}
          activeOpacity={0.7}
        >
          <View style={styles.tabButtonContent}>
            <Ionicons
              name={iconName}
              size={18}
              color={isActive ? colors.primary : colors.textMuted}
            />
            <Text
              size="sm"
              weight={isActive ? 'semibold' : 'regular'}
              color={isActive ? colors.primary : colors.textMuted}
            >
              {tabLabel}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [activeTab, colors, t, handleTabLayout]
  );

  // Theme-aware skeleton colors
  const skeletonBg = isDark ? neutral[800] : '#E1E9EE';
  const skeletonHighlight = isDark ? neutral[700] : '#F2F8FC';

  // Get active tab indicator width
  const activeIndex = TAB_KEYS.indexOf(activeTab);
  const indicatorWidth = tabWidths[activeIndex] || SCREEN_WIDTH / 3;

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={getSafeAreaEdges(['bottom'])}
      >
        <View style={styles.loadingContainer}>
          {/* Header skeleton */}
          <View style={[styles.headerSkeleton, { backgroundColor: colors.card }]}>
            <View style={styles.headerSkeletonContent}>
              <Skeleton
                width="70%"
                height={24}
                backgroundColor={skeletonBg}
                highlightColor={skeletonHighlight}
                style={{ borderRadius: radiusPixels.md }}
              />
              <Skeleton
                width="40%"
                height={16}
                backgroundColor={skeletonBg}
                highlightColor={skeletonHighlight}
                style={{ marginTop: spacingPixels[2], borderRadius: radiusPixels.sm }}
              />
            </View>
            <Skeleton
              width={40}
              height={40}
              backgroundColor={skeletonBg}
              highlightColor={skeletonHighlight}
              style={{ borderRadius: radiusPixels.full }}
            />
          </View>

          {/* Tab bar skeleton */}
          <View style={styles.tabBarSkeleton}>
            {[1, 2, 3].map(i => (
              <Skeleton
                key={i}
                width={80}
                height={36}
                backgroundColor={skeletonBg}
                highlightColor={skeletonHighlight}
                style={{ borderRadius: radiusPixels.lg }}
              />
            ))}
          </View>

          {/* Content skeleton */}
          <View style={styles.contentSkeleton}>
            <Skeleton
              width="100%"
              height={100}
              backgroundColor={skeletonBg}
              highlightColor={skeletonHighlight}
              style={{ borderRadius: radiusPixels.xl }}
            />
            <Skeleton
              width="100%"
              height={160}
              backgroundColor={skeletonBg}
              highlightColor={skeletonHighlight}
              style={{ marginTop: spacingPixels[4], borderRadius: radiusPixels.xl }}
            />
            <Skeleton
              width="100%"
              height={80}
              backgroundColor={skeletonBg}
              highlightColor={skeletonHighlight}
              style={{ marginTop: spacingPixels[4], borderRadius: radiusPixels.xl }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Not found state
  if (!facility) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={getSafeAreaEdges(['bottom'])}
      >
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconWrapper,
              { backgroundColor: isDark ? neutral[800] : primary[50] },
            ]}
          >
            <Ionicons name="business-outline" size={48} color={colors.primary} />
          </View>
          <Text size="xl" weight="bold" color={colors.text} style={styles.emptyTitle}>
            {t('facilitiesTab.empty.title')}
          </Text>
          <Text size="sm" color={colors.textMuted} style={styles.emptySubtitle}>
            {t('facilitiesTab.empty.description')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      {/* Enhanced Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card },
          isDark ? shadowsNative.sm : shadowsNative.DEFAULT,
        ]}
      >
        <View style={styles.headerContent}>
          <Text size="xl" weight="bold" color={colors.text} numberOfLines={2}>
            {facility.name}
          </Text>
          <View style={styles.headerMeta}>
            {facility.distance_meters !== null && (
              <View style={[styles.metaBadge, { backgroundColor: primary[500] + '15' }]}>
                <Ionicons name="navigate" size={12} color={colors.primary} />
                <Text size="xs" weight="medium" color={colors.primary}>
                  {facility.distance_meters < 1000
                    ? `${Math.round(facility.distance_meters)} m`
                    : `${(facility.distance_meters / 1000).toFixed(1)} km`}
                </Text>
              </View>
            )}
            {courts.length > 0 && (
              <View
                style={[
                  styles.metaBadge,
                  { backgroundColor: isDark ? neutral[700] : neutral[100] },
                ]}
              >
                <Ionicons name="grid" size={12} color={colors.textMuted} />
                <Text size="xs" weight="medium" color={colors.textMuted}>
                  {courts.length} {courts.length === 1 ? 'court' : 'courts'}
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={handleToggleFavorite}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[
            styles.favoriteButton,
            {
              backgroundColor: facilityIsFavorite
                ? colors.error + '15'
                : isDark
                  ? neutral[700]
                  : neutral[100],
            },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={facilityIsFavorite ? 'heart' : 'heart-outline'}
            size={22}
            color={facilityIsFavorite ? colors.error : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Polished Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: isDark ? neutral[900] : neutral[50] }]}>
        <View style={styles.tabBarInner}>
          {/* Animated indicator */}
          {tabWidths.length === TAB_KEYS.length && (
            <Animated.View
              style={[
                styles.tabIndicator,
                {
                  backgroundColor: isDark ? neutral[800] : colors.card,
                  width: indicatorWidth - spacingPixels[1],
                  transform: [{ translateX: tabIndicatorAnim }],
                },
                shadowsNative.sm,
              ]}
            />
          )}
          {TAB_KEYS.map((tab, index) => renderTabButton(tab, index))}
        </View>
      </View>

      {/* Tab content */}
      {activeTab === 'matches' ? (
        // MatchesTab has its own FlatList with scroll and refresh
        <View style={styles.content}>
          <MatchesTab facilityId={facilityId} />
        </View>
      ) : (
        // Info and Availability tabs use shared ScrollView
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'info' && (
            <InfoTab
              facility={facility}
              courts={courts}
              contacts={contacts}
              onOpenInMaps={handleOpenInMaps}
              colors={colors}
              isDark={isDark}
              t={t}
              isLoading={isLoading}
            />
          )}
          {activeTab === 'availability' && (
            <AvailabilityTab
              facility={facility}
              slots={formattedSlots}
              isLoading={availabilityLoading}
              courts={courts}
              colors={colors}
              isDark={isDark}
              t={t}
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacingPixels[2],
  },
  // Loading state styles
  loadingContainer: {
    flex: 1,
  },
  headerSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacingPixels[4],
    marginHorizontal: spacingPixels[4],
    marginTop: spacingPixels[2],
    borderRadius: radiusPixels.xl,
  },
  headerSkeletonContent: {
    flex: 1,
  },
  tabBarSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacingPixels[3],
    paddingHorizontal: spacingPixels[4],
    marginTop: spacingPixels[2],
  },
  contentSkeleton: {
    padding: spacingPixels[4],
  },
  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacingPixels[8],
  },
  emptyIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: radiusPixels.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacingPixels[4],
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: spacingPixels[2],
  },
  emptySubtitle: {
    textAlign: 'center',
    maxWidth: 280,
  },
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[4],
    marginHorizontal: spacingPixels[3],
    marginTop: spacingPixels[2],
    borderRadius: radiusPixels.xl,
  },
  headerContent: {
    flex: 1,
    marginRight: spacingPixels[3],
  },
  headerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingPixels[2],
    marginTop: spacingPixels[3],
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[1],
    paddingHorizontal: spacingPixels[2.5],
    paddingVertical: spacingPixels[1.5],
    borderRadius: radiusPixels.full,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: radiusPixels.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tab bar styles
  tabBar: {
    marginTop: spacingPixels[3],
    marginHorizontal: spacingPixels[3],
    borderRadius: radiusPixels.xl,
    padding: spacingPixels[1],
  },
  tabBarInner: {
    flexDirection: 'row',
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    left: spacingPixels[0.5],
    bottom: 0,
    borderRadius: radiusPixels.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacingPixels[2.5],
    alignItems: 'center',
    zIndex: 1,
  },
  tabButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[1.5],
  },
  // Content styles
  content: {
    flex: 1,
    marginTop: spacingPixels[2],
  },
  contentContainer: {
    paddingBottom: spacingPixels[6],
  },
});
