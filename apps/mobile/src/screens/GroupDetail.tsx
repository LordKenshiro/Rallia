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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';

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
  GroupOptionsModal,
} from '../features/groups';

const HEADER_HEIGHT = 140;

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
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  const { data: group, isLoading, refetch } = useGroupWithMembers(groupId);
  const { data: stats } = useGroupStats(groupId);
  const { data: activities } = useGroupActivity(groupId, 50);
  const { data: isModerator } = useIsGroupModerator(groupId, playerId);

  const leaveGroupMutation = useLeaveGroup();
  const deleteGroupMutation = useDeleteGroup();

  const handleOpenChat = useCallback(() => {
    if (group?.conversation_id) {
      navigation.navigate('Chat', { conversationId: group.conversation_id });
    }
  }, [group, navigation]);

  const handleLeaveGroup = useCallback(() => {
    Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
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
    ]);
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
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to delete group'
              );
            }
          },
        },
      ]
    );
  }, [groupId, playerId, deleteGroupMutation, navigation]);

  const handleShowOptions = useCallback(() => {
    setShowOptionsModal(true);
  }, []);

  // Build options for the menu modal
  const menuOptions = useMemo(() => {
    const isCreator = group?.created_by === playerId;
    const options: {
      id: string;
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      onPress: () => void;
      destructive?: boolean;
    }[] = [];

    if (isModerator) {
      options.push({
        id: 'edit',
        label: 'Edit Group',
        icon: 'create-outline',
        onPress: () => setShowEditModal(true),
      });
    }

    options.push({
      id: 'leave',
      label: 'Leave Group',
      icon: 'exit-outline',
      onPress: handleLeaveGroup,
      destructive: true,
    });

    if (isCreator) {
      options.push({
        id: 'delete',
        label: 'Delete Group',
        icon: 'trash-outline',
        onPress: handleDeleteGroup,
        destructive: true,
      });
    }

    return options;
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
        dayLabel = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
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
    // Calculate activity ring segments
    const membersCount = stats?.newMembersLast7Days || 0;
    const gamesCount = stats?.gamesCreatedLast7Days || 0;
    const messagesCount = stats?.messagesLast7Days || 0;
    const totalActivities = membersCount + gamesCount + messagesCount;

    // SVG circle properties
    const size = 100;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Calculate stroke dash offsets for each segment
    const membersPercent = totalActivities > 0 ? membersCount / totalActivities : 0;
    const gamesPercent = totalActivities > 0 ? gamesCount / totalActivities : 0;
    const messagesPercent = totalActivities > 0 ? messagesCount / totalActivities : 0;

    const membersLength = circumference * membersPercent;
    const gamesLength = circumference * gamesPercent;
    const messagesLength = circumference * messagesPercent;

    // Starting rotation for each segment (members starts at top, -90deg)
    const membersRotation = -90;
    const gamesRotation = membersRotation + membersPercent * 360;
    const messagesRotation = gamesRotation + gamesPercent * 360;

    switch (activeTab) {
      case 'home':
        return (
          <View style={styles.tabContent}>
            {/* Stats Card */}
            <View
              style={[
                styles.statsCard,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
            >
              <Text weight="semibold" size="base" style={{ color: colors.text, marginBottom: 16 }}>
                Last 7 days activities
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statCircle}>
                  {/* Donut Chart */}
                  <View style={styles.donutContainer}>
                    <Svg width={size} height={size}>
                      {/* Background circle */}
                      <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={colors.border}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                      />
                      {/* Members segment (cyan/blue) */}
                      {membersCount > 0 && (
                        <Circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          stroke="#5AC8FA"
                          strokeWidth={strokeWidth}
                          fill="transparent"
                          strokeDasharray={`${membersLength} ${circumference - membersLength}`}
                          strokeDashoffset={0}
                          strokeLinecap="round"
                          rotation={membersRotation}
                          origin={`${size / 2}, ${size / 2}`}
                        />
                      )}
                      {/* Games segment (orange) */}
                      {gamesCount > 0 && (
                        <Circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          stroke="#FF9500"
                          strokeWidth={strokeWidth}
                          fill="transparent"
                          strokeDasharray={`${gamesLength} ${circumference - gamesLength}`}
                          strokeDashoffset={0}
                          strokeLinecap="round"
                          rotation={gamesRotation}
                          origin={`${size / 2}, ${size / 2}`}
                        />
                      )}
                      {/* Messages segment (gray/dark) */}
                      {messagesCount > 0 && (
                        <Circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          stroke={isDark ? '#8E8E93' : '#636366'}
                          strokeWidth={strokeWidth}
                          fill="transparent"
                          strokeDasharray={`${messagesLength} ${circumference - messagesLength}`}
                          strokeDashoffset={0}
                          strokeLinecap="round"
                          rotation={messagesRotation}
                          origin={`${size / 2}, ${size / 2}`}
                        />
                      )}
                    </Svg>
                    {/* Center text */}
                    <View style={styles.donutCenter}>
                      <Text weight="bold" size="xl" style={{ color: colors.text }}>
                        {totalActivities}
                      </Text>
                      <Text size="xs" style={{ color: colors.textSecondary }}>
                        ACTIVITIES
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.statsList}>
                  <View style={styles.statItem}>
                    <Ionicons name="people" size={20} color="#5AC8FA" />
                    <Text size="sm" style={{ color: colors.text, marginLeft: 10 }}>
                      {membersCount} new members
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="tennisball" size={20} color="#FF9500" />
                    <Text size="sm" style={{ color: colors.text, marginLeft: 10 }}>
                      {gamesCount} game{gamesCount !== 1 ? 's' : ''} created
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons
                      name="chatbubble-ellipses"
                      size={20}
                      color={isDark ? '#8E8E93' : '#C7C7CC'}
                    />
                    <Text size="sm" style={{ color: colors.text, marginLeft: 10 }}>
                      {messagesCount} new messages in{'\n'}community chat
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* About Section */}
            {group?.description && (
              <View
                style={[
                  styles.aboutCard,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                ]}
              >
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
            <View
              style={[
                styles.leaderboardPreview,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
            >
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
              <Text
                size="sm"
                style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}
              >
                No games played yet
              </Text>
            </View>
          </View>
        );

      case 'leaderboard':
        return (
          <View style={styles.tabContent}>
            <View
              style={[
                styles.leaderboardCard,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
            >
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
              <View
                style={[
                  styles.emptyActivity,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                ]}
              >
                <Ionicons name="time-outline" size={48} color={colors.textMuted} />
                <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
                  No recent activity
                </Text>
              </View>
            ) : (
              groupedActivities.map((section, sectionIndex) => (
                <View key={sectionIndex} style={styles.activitySection}>
                  <Text
                    weight="semibold"
                    size="sm"
                    style={[styles.activityDayHeader, { color: colors.textSecondary }]}
                  >
                    {section.title}
                  </Text>
                  {section.data.map(activity => (
                    <View
                      key={activity.id}
                      style={[
                        styles.activityItem,
                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                      ]}
                    >
                      <View
                        style={[
                          styles.activityAvatar,
                          { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
                        ]}
                      >
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
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={64} color={colors.textMuted} />
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>Group not found</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {/* Header Section - with cover image or default icon */}
        {group.cover_image_url ? (
          <Image
            source={{ uri: group.cover_image_url }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.headerSection,
              { backgroundColor: isDark ? primary[900] : primary[100] },
            ]}
          >
            <View style={[styles.headerIcon, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="people" size={48} color={colors.primary} />
            </View>
          </View>
        )}

        {/* Group Info Card */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
          ]}
        >
          <Text weight="bold" size="xl" style={{ color: colors.text }}>
            {group.name}
          </Text>

          {/* Members Row */}
          <TouchableOpacity style={styles.membersRow} onPress={() => setShowMemberListModal(true)}>
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
                <View
                  style={[styles.memberAvatar, { backgroundColor: colors.primary, marginLeft: -8 }]}
                >
                  <Text size="xs" weight="semibold" style={{ color: '#FFFFFF' }}>
                    +{group.member_count - 5}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Action Buttons Row */}
          <View style={styles.actionButtonsRow}>
            {group.member_count < group.max_members && (
              <TouchableOpacity
                style={[styles.addMemberButton, { borderColor: colors.primary, flex: 1 }]}
                onPress={() => setShowAddMemberModal(true)}
              >
                <Ionicons name="person-add" size={18} color={colors.primary} />
                <Text weight="semibold" style={{ color: colors.primary, marginLeft: 8 }}>
                  Add Member
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.menuButton, { borderColor: colors.border }]}
              onPress={handleShowOptions}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                },
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

        {/* Bottom spacing for chat button */}
        <View style={{ height: 80 }} />
      </ScrollView>

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

      <GroupOptionsModal
        visible={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        options={menuOptions}
        title="Group Options"
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
  coverImage: {
    width: '100%',
    height: HEADER_HEIGHT,
  },
  headerSection: {
    height: HEADER_HEIGHT,
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
    borderBottomWidth: 1,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: -40,
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
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    marginTop: 24,
    marginHorizontal: 16,
    borderBottomWidth: 1,
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
  donutContainer: {
    width: 100,
    height: 100,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsList: {
    flex: 1,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
