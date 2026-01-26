/**
 * Communities Screen
 * Lists all public communities for discovery and communities the user is a member of
 * Features a segmented control to switch between "Discover" and "My Communities"
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  RefreshControl,
  Alert,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Text, Skeleton } from '@rallia/shared-components';
import { lightHaptic } from '@rallia/shared-utils';
import { useThemeStyles, useAuth, useTranslation, type TranslationKey } from '../hooks';
import { useActionsSheet } from '../context';
import {
  usePublicCommunities,
  usePlayerCommunities,
  useCreateCommunity,
  useRequestToJoinCommunity,
  usePlayerCommunitiesRealtime,
  usePublicCommunitiesRealtime,
  type CommunityWithStatus,
} from '@rallia/shared-hooks';
import type { RootStackParamList, CommunityStackParamList } from '../navigation/types';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { CreateCommunityModal, CommunityQRScannerModal } from '../features/communities';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<CommunityStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface ThemeColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
}

// Extracted CommunityCard component with press animation
const CommunityCard: React.FC<{
  item: CommunityWithStatus;
  index: number;
  colors: ThemeColors;
  isDark: boolean;
  activeTab: TabType;
  onPress: (community: CommunityWithStatus) => void;
  onRequestToJoin: (id: string, name: string) => void;
  isRequestPending: boolean;
}> = ({ item, index, colors, isDark, activeTab, onPress, onRequestToJoin, isRequestPending }) => {
  const scaleAnim = useMemo(() => new Animated.Value(1), []);
  const { t } = useTranslation();
  const isUserMember = item.is_member || item.membership_status === 'active';
  const isPending = item.membership_status === 'pending';

  const handlePressIn = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <TouchableWithoutFeedback
      onPress={() => onPress(item)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.communityCard,
          {
            backgroundColor: colors.cardBackground,
            marginRight: index % 2 === 0 ? CARD_GAP : 0,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Cover Image */}
        <View style={styles.imageContainer}>
          {item.cover_image_url ? (
            <Image
              source={{ uri: item.cover_image_url }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[styles.placeholderImage, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
            >
              <Ionicons name="globe" size={40} color={colors.textMuted} />
            </View>
          )}

          {/* Public/Private badge */}
          {!item.is_public && (
            <View style={[styles.badgeContainer, { backgroundColor: '#FF9500' }]}>
              <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
              <Text size="xs" weight="semibold" style={styles.badgeText}>
                {t('community.visibility.private' as TranslationKey)}
              </Text>
            </View>
          )}
        </View>

        {/* Community Info */}
        <View style={styles.communityInfo}>
          <Text weight="semibold" size="sm" style={{ color: colors.text }} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Member count + Status */}
          <View style={styles.bottomRow}>
            <View style={styles.memberCount}>
              <Ionicons name="people-outline" size={14} color={colors.textMuted} />
              <Text size="xs" style={{ color: colors.textMuted, marginLeft: 4 }}>
                {t('common.memberCount', { count: item.member_count })}
              </Text>
            </View>
          </View>

          {/* Join button for non-members in discover tab */}
          {activeTab === 'discover' && !isUserMember && !isPending && (
            <TouchableOpacity
              style={[styles.joinButton, { backgroundColor: colors.primary }]}
              onPress={e => {
                e.stopPropagation();
                onRequestToJoin(item.id, item.name);
              }}
              disabled={isRequestPending}
            >
              <Text size="xs" weight="semibold" style={{ color: '#FFFFFF' }}>
                {t('community.pendingRequests.requestToJoin')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Pending indicator */}
          {isPending && (
            <View
              style={[styles.pendingBadge, { backgroundColor: isDark ? '#3C3C3E' : '#E5E5EA' }]}
            >
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text size="xs" style={{ color: colors.textMuted, marginLeft: 4 }}>
                {t('community.pendingRequests.pending')}
              </Text>
            </View>
          )}

          {/* Member indicator */}
          {isUserMember && (
            <View style={[styles.memberBadge, { backgroundColor: '#34C75920' }]}>
              <Ionicons name="checkmark-circle" size={12} color="#34C759" />
              <Text size="xs" style={{ color: '#34C759', marginLeft: 4 }}>
                {t('community.members.title')}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

type TabType = 'discover' | 'my-communities';

export default function CommunitiesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useThemeStyles();
  const { session } = useAuth();
  const { openSheet } = useActionsSheet();
  const { t } = useTranslation();
  const playerId = session?.user?.id;

  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Switch to discover tab if user signs out while on "My Communities"
  useEffect(() => {
    if (activeTab === 'my-communities' && !playerId) {
      // Use setTimeout to avoid calling setState synchronously within effect
      setTimeout(() => {
        setActiveTab('discover');
      }, 0);
    }
  }, [activeTab, playerId]);

  // Queries
  const {
    data: publicCommunities,
    isLoading: isLoadingPublic,
    isRefetching: isRefetchingPublic,
    refetch: refetchPublic,
  } = usePublicCommunities(playerId);

  const {
    data: myCommunities,
    isLoading: isLoadingMy,
    isRefetching: isRefetchingMy,
    refetch: refetchMy,
  } = usePlayerCommunities(playerId);

  // Real-time subscriptions
  usePlayerCommunitiesRealtime(playerId);
  usePublicCommunitiesRealtime(playerId);

  // Mutations
  const createCommunityMutation = useCreateCommunity();
  const requestToJoinMutation = useRequestToJoinCommunity();

  const isLoading = activeTab === 'discover' ? isLoadingPublic : isLoadingMy;
  const isRefetching = activeTab === 'discover' ? isRefetchingPublic : isRefetchingMy;
  const communities = activeTab === 'discover' ? publicCommunities : myCommunities;

  const handleRefresh = useCallback(() => {
    if (activeTab === 'discover') {
      refetchPublic();
    } else {
      refetchMy();
    }
  }, [activeTab, refetchPublic, refetchMy]);

  const handleCreateCommunity = useCallback(
    async (
      name: string,
      description?: string,
      coverImageUrl?: string,
      isPublic: boolean = true
    ) => {
      if (!playerId) {
        // Not authenticated: open auth sheet
        openSheet();
        return;
      }

      try {
        const newCommunity = await createCommunityMutation.mutateAsync({
          playerId,
          input: { name, description, cover_image_url: coverImageUrl, is_public: isPublic },
        });
        setShowCreateModal(false);
        // Navigate to the new community
        navigation.navigate('CommunityDetail', { communityId: newCommunity.id });
      } catch (error) {
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create community');
      }
    },
    [playerId, createCommunityMutation, navigation, openSheet]
  );

  const handleRequestToJoin = useCallback(
    async (communityId: string, communityName: string) => {
      if (!playerId) {
        // Not authenticated: open auth sheet
        openSheet();
        return;
      }

      try {
        await requestToJoinMutation.mutateAsync({ communityId, playerId });
        Alert.alert(
          'Request Sent',
          `Your request to join "${communityName}" has been sent. A moderator will review it.`
        );
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error ? error.message : 'Failed to send join request'
        );
      }
    },
    [playerId, requestToJoinMutation, openSheet]
  );

  const handleCommunityPress = useCallback(
    (community: CommunityWithStatus) => {
      lightHaptic();
      navigation.navigate('CommunityDetail', { communityId: community.id });
    },
    [navigation]
  );

  const handleQRRequestSent = useCallback(
    (communityId: string, communityName: string) => {
      Alert.alert(
        t('community.qrScanner.requestSent'),
        t('community.qrScanner.requestSentMessage', { communityName }),
        [{ text: t('common.ok') }]
      );
    },
    [t]
  );

  const handleTabChange = useCallback(
    (tab: TabType) => {
      lightHaptic();
      // If trying to access "My Communities" without auth, open auth sheet
      if (tab === 'my-communities' && !playerId) {
        openSheet();
        return;
      }
      setActiveTab(tab);
    },
    [playerId, openSheet]
  );

  const renderCommunityItem = useCallback(
    ({ item, index }: { item: CommunityWithStatus; index: number }) => {
      return (
        <CommunityCard
          item={item}
          index={index}
          colors={colors}
          isDark={isDark}
          activeTab={activeTab}
          onPress={handleCommunityPress}
          onRequestToJoin={handleRequestToJoin}
          isRequestPending={requestToJoinMutation.isPending}
        />
      );
    },
    [
      colors,
      isDark,
      activeTab,
      handleCommunityPress,
      handleRequestToJoin,
      requestToJoinMutation.isPending,
    ]
  );

  const renderEmptyState = useMemo(
    () => (
      <View style={styles.emptyState}>
        <Ionicons
          name={activeTab === 'discover' ? 'globe-outline' : 'people-outline'}
          size={64}
          color={colors.textMuted}
        />
        <Text weight="semibold" size="lg" style={[styles.emptyTitle, { color: colors.text }]}>
          {activeTab === 'discover'
            ? t('community.empty.discover.title')
            : t('community.empty.myCommunities.title')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {activeTab === 'discover'
            ? t('community.empty.discover.subtitle')
            : t('community.empty.myCommunities.subtitle')}
        </Text>
        {activeTab === 'discover' && (
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (!playerId) {
                // Not authenticated: open auth sheet
                openSheet();
              } else {
                setShowCreateModal(true);
              }
            }}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text weight="semibold" style={styles.createButtonText}>
              {t('community.createCommunity')}
            </Text>
          </TouchableOpacity>
        )}
        {activeTab === 'my-communities' && (
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={() => handleTabChange('discover')}
          >
            <Ionicons name="compass-outline" size={20} color="#FFFFFF" />
            <Text weight="semibold" style={styles.createButtonText}>
              {t('community.discoverCommunities')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [colors, activeTab, handleTabChange, t, openSheet, playerId]
  );

  const renderTabs = useMemo(
    () => (
      <View style={[styles.tabContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'discover' && [
              styles.activeTab,
              { backgroundColor: colors.cardBackground },
            ],
          ]}
          onPress={() => handleTabChange('discover')}
        >
          <Ionicons
            name="compass-outline"
            size={18}
            color={activeTab === 'discover' ? colors.primary : colors.textMuted}
          />
          <Text
            size="sm"
            weight={activeTab === 'discover' ? 'semibold' : 'medium'}
            style={{
              color: activeTab === 'discover' ? colors.primary : colors.textMuted,
              marginLeft: 6,
            }}
          >
            {t('community.tabs.discover')}
          </Text>
        </TouchableOpacity>
        {/* Only show "My Communities" tab for authenticated users */}
        {playerId && (
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'my-communities' && [
                styles.activeTab,
                { backgroundColor: colors.cardBackground },
              ],
            ]}
            onPress={() => handleTabChange('my-communities')}
          >
            <Ionicons
              name="heart-outline"
              size={18}
              color={activeTab === 'my-communities' ? colors.primary : colors.textMuted}
            />
            <Text
              size="sm"
              weight={activeTab === 'my-communities' ? 'semibold' : 'medium'}
              style={{
                color: activeTab === 'my-communities' ? colors.primary : colors.textMuted,
                marginLeft: 6,
              }}
            >
              {t('community.tabs.myCommunities')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [colors, isDark, activeTab, handleTabChange, t, playerId]
  );

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['bottom']}
      >
        {/* Only show tabs when authenticated */}
        {playerId && renderTabs}
        <View style={styles.loadingContainer}>
          <View style={styles.gridSkeleton}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <View
                key={i}
                style={[styles.cardSkeleton, { backgroundColor: colors.cardBackground }]}
              >
                <Skeleton
                  width="100%"
                  height={CARD_WIDTH * 0.6}
                  borderRadius={12}
                  backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'}
                  highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'}
                  style={{ marginBottom: 12 }}
                />
                <Skeleton
                  width="70%"
                  height={16}
                  backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'}
                  highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'}
                  style={{ marginBottom: 8 }}
                />
                <Skeleton
                  width="50%"
                  height={12}
                  backgroundColor={isDark ? '#2C2C2E' : '#E1E9EE'}
                  highlightColor={isDark ? '#3C3C3E' : '#F2F8FC'}
                />
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      {/* Only show tabs when authenticated (to switch between Discover and My Communities) */}
      {playerId && renderTabs}

      <FlatList
        data={communities}
        renderItem={renderCommunityItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={[
          styles.listContent,
          (!communities || communities.length === 0) && styles.emptyListContent,
        ]}
        columnWrapperStyle={
          communities && communities.length > 1 ? styles.columnWrapper : undefined
        }
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB Container - QR Scanner + Create Community */}
      <View style={styles.fabContainer}>
        {/* QR Scanner Button */}
        <TouchableOpacity
          style={[styles.fabSecondary, { backgroundColor: colors.cardBackground }]}
          onPress={() => {
            lightHaptic();
            if (!playerId) {
              // Not authenticated: open auth sheet
              openSheet();
            } else {
              setShowQRScanner(true);
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
        </TouchableOpacity>

        {/* Create Community Button */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (!playerId) {
              // Not authenticated: open auth sheet
              openSheet();
            } else {
              setShowCreateModal(true);
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Create Community Modal */}
      <CreateCommunityModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateCommunity}
        isLoading={createCommunityMutation.isPending}
      />

      {/* QR Scanner Modal */}
      {playerId && (
        <CommunityQRScannerModal
          visible={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          playerId={playerId}
          onRequestSent={handleQRRequestSent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: CARD_PADDING,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    padding: CARD_PADDING,
  },
  gridSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  cardSkeleton: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 12,
    marginBottom: CARD_GAP,
  },
  listContent: {
    padding: CARD_PADDING,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  columnWrapper: {
    marginBottom: CARD_GAP,
  },
  communityCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH * 0.65,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  badgeText: {
    color: '#FFFFFF',
  },
  communityInfo: {
    padding: 12,
    gap: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  pendingBadge: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  memberBadge: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fabSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
