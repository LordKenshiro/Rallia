import React, { useCallback, useMemo } from 'react';
import {
  View,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text as RNText,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks';
import { useTranslation } from '../hooks/useTranslation';
import { useOverlay } from '../context';
import {
  Notification,
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_TYPE_COLORS,
} from '@rallia/shared-types';
import { useNotificationsWithActions } from '@rallia/shared-hooks';
import {
  lightTheme,
  darkTheme,
  spacingPixels,
  fontSizePixels,
  fontWeightNumeric,
  radiusPixels,
  primary,
  neutral,
  base,
} from '@rallia/design-system';
import { lightHaptic, successHaptic, warningHaptic } from '@rallia/shared-utils';

// Helper function to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'Just now';
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHour < 24) {
    return `${diffHour}h ago`;
  } else if (diffDay < 7) {
    return `${diffDay}d ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

// Helper function to get date section key
function getDateSectionKey(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() >= today.getTime()) {
    return 'Today';
  } else if (dateOnly.getTime() >= yesterday.getTime()) {
    return 'Yesterday';
  } else if (dateOnly.getTime() >= thisWeekStart.getTime()) {
    return 'This Week';
  } else {
    return 'Earlier';
  }
}

// Group notifications by date
function groupNotificationsByDate(
  notifications: Notification[]
): { title: string; data: Notification[] }[] {
  const groups: Record<string, Notification[]> = {};
  const order = ['Today', 'Yesterday', 'This Week', 'Earlier'];

  notifications.forEach(notification => {
    const key = getDateSectionKey(notification.created_at);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(notification);
  });

  return order
    .filter(key => groups[key]?.length > 0)
    .map(key => ({ title: key, data: groups[key] }));
}

// Notification card component
interface NotificationCardProps {
  notification: Notification;
  onPress: () => void;
  onDelete: () => void;
  isDark: boolean;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onDelete,
  isDark,
}) => {
  const isUnread = !notification.read_at;
  const notificationType = notification.type;
  const iconName = NOTIFICATION_TYPE_ICONS[notificationType] ?? 'notifications-outline';
  const iconColor = NOTIFICATION_TYPE_COLORS[notificationType] ?? primary[500];

  const themeColors = isDark ? darkTheme : lightTheme;
  const cardColors = {
    background: isUnread ? themeColors.card : themeColors.muted,
    text: themeColors.foreground,
    textSecondary: themeColors.mutedForeground,
    iconMuted: themeColors.mutedForeground,
    border: themeColors.border,
  };

  const handlePress = () => {
    lightHaptic();
    onPress();
  };

  const handleDelete = () => {
    warningHaptic();
    onDelete();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.9}
      style={[
        styles.card,
        {
          backgroundColor: cardColors.background,
          borderColor: isUnread ? iconColor : cardColors.border,
          borderLeftWidth: isUnread ? 8 : 1,
          opacity: isUnread ? 1 : 0.8,
        },
      ]}
    >
      <View style={styles.cardContent}>
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${iconColor}${isUnread ? '30' : '15'}` },
          ]}
        >
          <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={20} color={iconColor} />
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <View style={styles.contentHeader}>
            {/* Unread indicator */}
            {isUnread && <View style={[styles.unreadIndicator, { backgroundColor: iconColor }]} />}
            <Text
              size="base"
              weight={isUnread ? 'semibold' : 'regular'}
              color={isUnread ? cardColors.text : cardColors.textSecondary}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
          </View>
          {notification.body && (
            <Text
              size="sm"
              color={cardColors.textSecondary}
              numberOfLines={2}
              style={styles.bodyText}
            >
              {notification.body}
            </Text>
          )}
          <Text size="xs" color={cardColors.textSecondary} style={styles.timeText}>
            {formatRelativeTime(notification.created_at)}
          </Text>
        </View>

        {/* Delete action */}
        <TouchableOpacity
          onPress={e => {
            e.stopPropagation();
            handleDelete();
          }}
          style={styles.actionButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color={primary[500]} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const Notifications: React.FC = () => {
  const { session, isAuthenticated, loading: isLoadingAuth } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { startLogin } = useOverlay();
  const isDark = theme === 'dark';

  // Theme-aware colors from design system
  const themeColors = isDark ? darkTheme : lightTheme;
  const colors = useMemo(
    () => ({
      background: themeColors.background,
      cardBackground: themeColors.card,
      text: themeColors.foreground,
      textSecondary: isDark ? primary[300] : neutral[600],
      textMuted: themeColors.mutedForeground,
      icon: themeColors.foreground,
      iconMuted: themeColors.mutedForeground,
      buttonActive: isDark ? primary[500] : primary[600],
      buttonTextActive: base.white,
      border: themeColors.border,
    }),
    [themeColors, isDark]
  );

  const userId = session?.user?.id;

  const {
    notifications,
    isLoading: isLoadingNotifications,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isMarkingAllAsRead,
  } = useNotificationsWithActions(userId);

  // Group notifications by date
  const sections = useMemo(() => groupNotificationsByDate(notifications), [notifications]);

  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      // Mark as read when pressed
      if (!notification.read_at) {
        successHaptic();
        markAsRead(notification.id);
      }

      // Navigate to target based on notification type and target_id
      if (notification.target_id) {
        // TODO: Navigate to specific entity based on notification.type
        // For now, just log it
        console.log('Navigate to:', notification.type, notification.target_id);
      }
    },
    [markAsRead]
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderNotificationCard = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationCard
        notification={item}
        onPress={() => handleNotificationPress(item)}
        onDelete={() => deleteNotification(item.id)}
        isDark={isDark}
      />
    ),
    [handleNotificationPress, markAsRead, deleteNotification, isDark]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
        <Text size="sm" weight="semibold" color={colors.textMuted}>
          {section.title}
        </Text>
      </View>
    ),
    [colors]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={64} color={colors.iconMuted} />
      <Text size="lg" weight="semibold" color={colors.textMuted} style={styles.emptyTitle}>
        {t('notifications.empty')}
      </Text>
      <Text size="sm" color={colors.textMuted} style={styles.emptyDescription}>
        {t('notifications.emptyDescription')}
      </Text>
    </View>
  );

  const renderSignInPrompt = () => (
    <View style={[styles.emptyContainer, { backgroundColor: colors.cardBackground }]}>
      <Ionicons name="lock-closed-outline" size={64} color={colors.iconMuted} />
      <RNText style={[styles.signInTitle, { color: colors.textSecondary }]}>
        Sign In Required
      </RNText>
      <RNText style={[styles.signInDescription, { color: colors.textMuted }]}>
        Please sign in to view your notifications
      </RNText>
      <TouchableOpacity
        onPress={startLogin}
        style={[styles.signInButton, { backgroundColor: colors.buttonActive }]}
      >
        <Ionicons name="log-in-outline" size={18} color={colors.buttonTextActive} />
        <RNText style={[styles.signInButtonText, { color: colors.buttonTextActive }]}>
          {t('auth.signIn')}
        </RNText>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.buttonActive} />
      </View>
    );
  };

  const renderHeader = () => {
    if (unreadCount === 0) return null;
    return (
      <View style={styles.headerContainer}>
        <Text size="sm" color={colors.textMuted}>
          {unreadCount} {t('notifications.unread')}
        </Text>
        <TouchableOpacity
          onPress={() => {
            successHaptic();
            markAllAsRead();
          }}
          disabled={isMarkingAllAsRead}
          style={styles.markAllButton}
        >
          {isMarkingAllAsRead ? (
            <ActivityIndicator size="small" color={colors.buttonActive} />
          ) : (
            <>
              <Ionicons name="checkmark-done-outline" size={16} color={colors.buttonActive} />
              <Text size="sm" color={colors.buttonActive} style={styles.markAllText}>
                {t('notifications.markAllRead')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      {isLoadingAuth ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonActive} />
        </View>
      ) : !isAuthenticated ? (
        renderSignInPrompt()
      ) : isLoadingNotifications ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonActive} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderNotificationCard}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContent,
            sections.length === 0 && styles.emptyListContent,
          ]}
          ListHeaderComponent={sections.length > 0 ? renderHeader : null}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isFetchingNextPage}
              onRefresh={refetch}
              tintColor={colors.buttonActive}
              colors={[colors.buttonActive]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: spacingPixels[4],
    paddingBottom: spacingPixels[5],
    flexGrow: 1,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingPixels[4],
    marginBottom: spacingPixels[3],
  },
  sectionHeader: {
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[2],
    marginBottom: spacingPixels[1],
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 'auto',
    gap: spacingPixels[2],
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllText: {
    marginLeft: spacingPixels[1],
  },
  card: {
    marginHorizontal: spacingPixels[4],
    marginBottom: spacingPixels[3],
    borderRadius: radiusPixels.xl,
    padding: spacingPixels[4],
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unreadIndicator: {
    width: spacingPixels[2],
    height: spacingPixels[2],
    borderRadius: radiusPixels.DEFAULT,
  },
  iconContainer: {
    width: spacingPixels[10],
    height: spacingPixels[10],
    borderRadius: radiusPixels.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingPixels[3],
  },
  contentContainer: {
    flex: 1,
  },
  bodyText: {
    marginTop: spacingPixels[0.5],
  },
  timeText: {
    marginTop: spacingPixels[1],
  },
  actionButton: {
    padding: spacingPixels[2],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[8],
    paddingVertical: spacingPixels[14],
  },
  emptyTitle: {
    marginTop: spacingPixels[4],
    marginBottom: spacingPixels[2],
  },
  emptyDescription: {
    textAlign: 'center',
    lineHeight: fontSizePixels.sm * 1.5,
  },
  footerLoader: {
    alignItems: 'center',
    paddingVertical: spacingPixels[4],
  },
  signInTitle: {
    fontSize: fontSizePixels.lg,
    fontWeight: fontWeightNumeric.semibold,
    marginTop: spacingPixels[4],
    marginBottom: spacingPixels[2],
  },
  signInDescription: {
    fontSize: fontSizePixels.sm,
    textAlign: 'center',
    lineHeight: fontSizePixels.sm * 1.5,
  },
  signInButton: {
    marginTop: spacingPixels[6],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[3.5],
    paddingHorizontal: spacingPixels[8],
    borderRadius: radiusPixels.lg,
    gap: spacingPixels[2],
  },
  signInButtonText: {
    fontSize: fontSizePixels.base,
    fontWeight: fontWeightNumeric.medium,
  },
});

export default Notifications;
