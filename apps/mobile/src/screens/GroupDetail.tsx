/**
 * GroupDetail Screen
 * Shows group details with tabs: Home, Leaderboard, Activity
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import { Text } from '@rallia/shared-components';
import { useThemeStyles, useAuth } from '../hooks';
import {
  useGroupWithMembers,
  useGroupStats,
  useGroupActivity,
  useIsGroupModerator,
  useLeaveGroup,
  useDeleteGroup,
  type GroupActivity as GroupActivityType,
} from '@rallia/shared-hooks';
import type { RootStackParamList } from '../navigation/types';
import { primary } from '@rallia/design-system';
import {
  EditGroupModal,
  AddMemberModal,
  MemberListModal,
} from '../features/groups';

const HEADER_IMAGE_HEIGHT = 180;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type GroupDetailRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;

type TabKey = 'home' | 'leaderboard' | 'activity';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'activity', label: 'Activity' },
];

export default function GroupDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GroupDetailRouteProp>();
  const { groupId } = route.params;

  const { colors, isDark } = useThemeStyles();
  const { session } = useAuth();
  const playerId = session?.user?.id;

  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showMemberListModal, setShowMemberListModal] = useState(false);

  const scrollY = useSharedValue(0);

  const { data: group, isLoading, refetch } = useGroupWithMembers(groupId);
  const { data: stats } = useGroupStats(groupId);
  const { data: activities } = useGroupActivity(groupId, 50);
  const { data: isModerator } = useIsGroupModerator(groupId, playerId);

  const leaveGroupMutation = useLeaveGroup();
  const deleteGroupMutation = useDeleteGroup();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [-100, 0, HEADER_IMAGE_HEIGHT],
      [HEADER_IMAGE_HEIGHT + 100, HEADER_IMAGE_HEIGHT, 60],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_IMAGE_HEIGHT - 60],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { height, opacity };
  });

  const handleOpenChat = useCallback(() => {
    if (group?.conversation_id) {
      navigation.navigate('Chat', { conversationId: group.conversation_id });
    }
  }, [group, navigation]);

  const handleLeaveGroup = useCallback(() => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (!playerId) return;
            try {
              await leaveGroupMutation.mutateAsync({ groupId, playerId });
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to leave group');
            }
          },
        },
      ]
    );
  }, [groupId, playerId, leaveGroupMutation, navigation]);

  const handleDeleteGroup = useCallback(() => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!playerId) return;
            try {
              await deleteGroupMutation.mutateAsync({ groupId, playerId });
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete group');
            }
          },
        },
      ]
    );
  }, [groupId, playerId, deleteGroupMutation, navigation]);

  const handleShowOptions = useCallback(() => {
    const isCreator = group?.created_by === playerId;
    const options: { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }[] = [
      { text: 'Cancel', style: 'cancel' },
    ];

    if (isModerator) {
      options.unshift({
        text: 'Edit Group',
        style: 'default',
        onPress: () => setShowEditModal(true),
      });
    }

    options.unshift({
      text: 'Leave Group',
      style: 'destructive',
      onPress: handleLeaveGroup,
    });

    if (isCreator) {
      options.unshift({
        text: 'Delete Group',
        style: 'destructive',
        onPress: handleDeleteGroup,
      });
    }

    Alert.alert('Group Options', undefined, options);
  }, [group, playerId, isModerator, handleLeaveGroup, handleDeleteGroup]);

  // Format activity time
  const formatActivityTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  // Group activities by day
  const groupedActivities = useMemo(() => {
    if (!activities) return [];
    
    const groups: { title: string; data: GroupActivityType[] }[] = [];
    let currentDay = '';
    
    for (const activity of activities) {
      const date = new Date(activity.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dayLabel: string;
      if (date.toDateString() === today.toDateString()) {
        dayLabel = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dayLabel = 'Yesterday';
      } else {
        dayLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      }
      
      if (dayLabel !== currentDay) {
        groups.push({ title: dayLabel, data: [] });
        currentDay = dayLabel;
      }
      
      groups[groups.length - 1].data.push(activity);
    }
    
    return groups;
  }, [activities]);

  // Get activity message
  const getActivityMessage = useCallback((activity: GroupActivityType) => {
    const actorName = activity.actor?.profile?.first_name || 'Someone';
    
    switch (activity.activity_type) {
      case 'member_joined':
        return `${actorName} joined the group`;
      case 'member_left':
        return `${actorName} left the group`;
      case 'game_created':
        return `${actorName} created a new game`;
      case 'message_sent':
        return `${actorName} sent a message`;
      case 'group_updated':
        return `${actorName} updated the group`;
      default:
        return `${actorName} performed an action`;
    }
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <View style={styles.tabContent}>
            {/* Stats Card */}
            <View style={[styles.statsCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Text weight="semibold" size="base" style={{ color: colors.text, marginBottom: 16 }}>
                Last 7 days activities
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statCircle}>
                  <View style={[styles.circleProgress, { borderColor: colors.primary }]}>
                    <Text weight="bold" size="xl" style={{ color: colors.primary }}>
                      {(stats?.gamesCreatedLast7Days || 0) + (stats?.newMembersLast7Days || 0)}
                    </Text>
                    <Text size="xs" style={{ color: colors.textSecondary }}>ACTIVITIES</Text>
                  </View>
                </View>
                <View style={styles.statsList}>
                  <View style={styles.statItem}>
                    <Ionicons name="person-add" size={18} color={colors.primary} />
                    <Text size="sm" style={{ color: colors.text, marginLeft: 8 }}>
                      {stats?.newMembersLast7Days || 0} new members
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="tennisball" size={18} color={colors.primary} />
                    <Text size="sm" style={{ color: colors.text, marginLeft: 8 }}>
                      {stats?.gamesCreatedLast7Days || 0} games created
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="chatbubble" size={18} color={colors.primary} />
                    <Text size="sm" style={{ color: colors.text, marginLeft: 8 }}>
                      {stats?.messagesLast7Days || 0} messages in chat
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* About Section */}
            {group?.description && (
              <View style={[styles.aboutCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={styles.aboutHeader}>
                  <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
                  <Text weight="semibold" size="base" style={{ color: colors.text, marginLeft: 8 }}>
                    About
                  </Text>
                </View>
                <Text style={{ color: colors.textSecondary, lineHeight: 22, marginTop: 8 }}>
                  {group.description}
                </Text>
              </View>
            )}

            {/* Leaderboard Preview */}
            <View style={[styles.leaderboardPreview, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitle}>
                  <Ionicons name="trophy" size={20} color={colors.primary} />
                  <Text weight="semibold" size="base" style={{ color: colors.text, marginLeft: 8 }}>
                    Leaderboard
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setActiveTab('leaderboard')}>
                  <Text size="sm" style={{ color: colors.primary }}>
                    View all
                  </Text>
                </TouchableOpacity>
              </View>
              {/* Placeholder - will be implemented with match tracking */}
              <Text size="sm" style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                No games played yet
              </Text>
            </View>
          </View>
        );

      case 'leaderboard':
        return (
          <View style={styles.tabContent}>
            <View style={[styles.leaderboardCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Text weight="semibold" size="lg" style={{ color: colors.text, marginBottom: 16 }}>
                Group Leaderboard
              </Text>
              {/* Placeholder */}
              <View style={styles.emptyLeaderboard}>
                <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
                <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                  Play games with group members to appear on the leaderboard
                </Text>
              </View>
            </View>
          </View>
        );

      case 'activity':
        return (
          <View style={styles.tabContent}>
            {groupedActivities.length === 0 ? (
              <View style={[styles.emptyActivity, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Ionicons name="time-outline" size={48} color={colors.textMuted} />
                <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
                  No recent activity
                </Text>
              </View>
            ) : (
              groupedActivities.map((section, sectionIndex) => (
                <View key={sectionIndex} style={styles.activitySection}>
                  <Text weight="semibold" size="sm" style={[styles.activityDayHeader, { color: colors.textSecondary }]}>
                    {section.title}
                  </Text>
                  {section.data.map((activity) => (
                    <View
                      key={activity.id}
                      style={[styles.activityItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                    >
                      <View style={[styles.activityAvatar, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                        {activity.actor?.profile?.profile_picture_url ? (
                          <Image
                            source={{ uri: activity.actor.profile.profile_picture_url }}
                            style={styles.avatarImage}
                          />
                        ) : (
                          <Ionicons name="person" size={20} color={colors.textMuted} />
                        )}
                      </View>
                      <View style={styles.activityContent}>
                        <Text size="sm" style={{ color: colors.text }}>
                          {getActivityMessage(activity)}
                        </Text>
                        <Text size="xs" style={{ color: colors.textMuted }}>
                          {formatActivityTime(activity.created_at)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={64} color={colors.textMuted} />
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
            Group not found
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: '#FFFFFF' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header with group icon */}
      <Animated.View style={[styles.header, headerAnimatedStyle, { backgroundColor: isDark ? primary[900] : primary[100] }]}>
        <View style={styles.headerContent}>
          <View style={[styles.headerIcon, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="people" size={48} color={colors.primary} />
          </View>
        </View>
      </Animated.View>

      {/* Navigation Bar */}
      <View style={[styles.navBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text weight="semibold" size="lg" style={{ color: colors.text }} numberOfLines={1}>
          {group.name}
        </Text>
        <TouchableOpacity onPress={handleShowOptions} style={styles.navButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Spacer for header */}
        <View style={{ height: HEADER_IMAGE_HEIGHT - 60 }} />

        {/* Group Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text weight="bold" size="xl" style={{ color: colors.text }}>
            {group.name}
          </Text>
          
          {/* Members Row */}
          <TouchableOpacity
            style={styles.membersRow}
            onPress={() => setShowMemberListModal(true)}
          >
            <Text size="sm" style={{ color: colors.textSecondary }}>
              {group.member_count} members
            </Text>
            <View style={styles.memberAvatars}>
              {group.members.slice(0, 5).map((member, index) => (
                <View
                  key={member.id}
                  style={[
                    styles.memberAvatar,
                    { 
                      backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
                      marginLeft: index > 0 ? -8 : 0,
                      zIndex: 5 - index,
                    },
                  ]}
                >
                  {member.player?.profile?.profile_picture_url ? (
                    <Image
                      source={{ uri: member.player.profile.profile_picture_url }}
                      style={styles.memberAvatarImage}
                    />
                  ) : (
                    <Text size="xs" weight="semibold" style={{ color: colors.text }}>
                      {member.player?.profile?.first_name?.charAt(0) || '?'}
                    </Text>
                  )}
                </View>
              ))}
              {group.member_count > 5 && (
                <View style={[styles.memberAvatar, { backgroundColor: colors.primary, marginLeft: -8 }]}>
                  <Text size="xs" weight="semibold" style={{ color: '#FFFFFF' }}>
                    +{group.member_count - 5}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Add Member Button */}
          {group.member_count < group.max_members && (
            <TouchableOpacity
              style={[styles.addMemberButton, { borderColor: colors.primary }]}
              onPress={() => setShowAddMemberModal(true)}
            >
              <Ionicons name="person-add" size={18} color={colors.primary} />
              <Text weight="semibold" style={{ color: colors.primary, marginLeft: 8 }}>
                Add Member
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Bar */}
        <View style={[styles.tabBar, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                weight={activeTab === tab.key ? 'semibold' : 'regular'}
                style={{ color: activeTab === tab.key ? colors.primary : colors.textSecondary }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </Animated.ScrollView>

      {/* Chat Button */}
      <TouchableOpacity
        style={[styles.chatButton, { backgroundColor: colors.primary }]}
        onPress={handleOpenChat}
      >
        <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
        <Text weight="semibold" style={styles.chatButtonText}>
          Chat with members
        </Text>
      </TouchableOpacity>

      {/* Modals */}
      <EditGroupModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        group={group}
        onSuccess={() => {
          setShowEditModal(false);
          refetch();
        }}
      />

      <AddMemberModal
        visible={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        groupId={groupId}
        currentMemberIds={group.members.map(m => m.player_id)}
        onSuccess={() => {
          setShowAddMemberModal(false);
          refetch();
        }}
      />

      <MemberListModal
        visible={showMemberListModal}
        onClose={() => setShowMemberListModal(false)}
        group={group}
        currentUserId={playerId || ''}
        isModerator={isModerator || false}
        onMemberRemoved={() => refetch()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    overflow: 'hidden',
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  infoCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  memberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
  },
  tabBar: {
    flexDirection: 'row',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabContent: {
    padding: 16,
    gap: 16,
  },
  statsCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCircle: {
    marginRight: 24,
  },
  circleProgress: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsList: {
    flex: 1,
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aboutCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardPreview: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyLeaderboard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  activitySection: {
    marginBottom: 8,
  },
  activityDayHeader: {
    marginBottom: 8,
    marginLeft: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  activityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  activityContent: {
    flex: 1,
  },
  emptyActivity: {
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  chatButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
