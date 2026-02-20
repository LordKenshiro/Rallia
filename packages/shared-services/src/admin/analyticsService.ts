/**
 * Analytics Service
 *
 * Provides admin-level analytics data access for dashboards,
 * KPIs, and reporting capabilities.
 */

import { supabase } from '../supabase';

// =============================================================================
// TYPES
// =============================================================================

/** Real-time user statistics */
export interface RealtimeUserStats {
  totalUsers: number;
  activeToday: number;
  activeWeek: number;
  activeMonth: number;
  newToday: number;
  newWeek: number;
}

/** Match statistics */
export interface MatchStatistics {
  totalMatches: number;
  scheduledMatches: number;
  completedMatches: number;
  cancelledMatches: number;
  avgParticipants: number;
}

/** Onboarding funnel step */
export interface OnboardingFunnelStep {
  screenName: string;
  totalViews: number;
  completions: number;
  completionRate: number;
  avgTimeSeconds: number;
}

/** Analytics snapshot record */
export interface AnalyticsSnapshot {
  id: string;
  snapshotDate: string;
  sportId: string | null;
  metricType: string;
  metricName: string;
  metricValue: number;
  metricMetadata: Record<string, unknown>;
  createdAt: string;
}

/** Metric trend data point */
export interface MetricTrendPoint {
  date: string;
  value: number;
}

/** Sport-specific statistics */
export interface SportStatistics {
  sportId: string;
  sportName: string;
  totalPlayers: number;
  matchesCreated: number;
  matchesCompleted: number;
  activePlayersWeek: number;
}

/** KPI summary for dashboard */
export interface KPISummary {
  users: RealtimeUserStats;
  matches: MatchStatistics;
  sportStats: SportStatistics[];
  onboardingFunnel: OnboardingFunnelStep[];
}

/** Dashboard widget data */
export interface DashboardWidget {
  id: string;
  title: string;
  type: 'number' | 'percentage' | 'chart' | 'trend';
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  trend?: MetricTrendPoint[];
}

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Get real-time user statistics
 */
export async function getRealtimeUserStats(): Promise<RealtimeUserStats> {
  try {
    const { data, error } = await supabase.rpc('get_realtime_user_count');

    if (error) {
      console.error('Error fetching realtime user stats:', error);
      // Return fallback with direct queries
      return await getFallbackUserStats();
    }

    if (data && data.length > 0) {
      const row = data[0];
      return {
        totalUsers: Number(row.total_users) || 0,
        activeToday: Number(row.active_today) || 0,
        activeWeek: Number(row.active_week) || 0,
        activeMonth: Number(row.active_month) || 0,
        newToday: Number(row.new_today) || 0,
        newWeek: Number(row.new_week) || 0,
      };
    }

    return await getFallbackUserStats();
  } catch (error) {
    console.error('Error in getRealtimeUserStats:', error);
    return await getFallbackUserStats();
  }
}

/**
 * Fallback user stats using direct queries
 */
async function getFallbackUserStats(): Promise<RealtimeUserStats> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Total users
    const { count: totalUsers } = await supabase
      .from('profile')
      .select('id', { count: 'exact', head: true });

    // New users today
    const { count: newToday } = await supabase
      .from('profile')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today);

    // New users this week
    const { count: newWeek } = await supabase
      .from('profile')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo);

    // Active users (approximate using profile updated_at as proxy)
    const { count: activeMonth } = await supabase
      .from('profile')
      .select('id', { count: 'exact', head: true })
      .gte('updated_at', monthAgo);

    return {
      totalUsers: totalUsers || 0,
      activeToday: Math.round((activeMonth || 0) / 30),
      activeWeek: Math.round((activeMonth || 0) / 4),
      activeMonth: activeMonth || 0,
      newToday: newToday || 0,
      newWeek: newWeek || 0,
    };
  } catch (error) {
    console.error('Error in getFallbackUserStats:', error);
    return {
      totalUsers: 0,
      activeToday: 0,
      activeWeek: 0,
      activeMonth: 0,
      newToday: 0,
      newWeek: 0,
    };
  }
}

/**
 * Get match statistics
 */
export async function getMatchStatistics(
  sportId?: string,
  days: number = 30
): Promise<MatchStatistics> {
  try {
    const { data, error } = await supabase.rpc('get_match_statistics', {
      p_sport_id: sportId || null,
      p_days: days,
    });

    if (error) {
      console.error('Error fetching match statistics:', error);
      return await getFallbackMatchStats(sportId, days);
    }

    if (data && data.length > 0) {
      const row = data[0];
      return {
        totalMatches: Number(row.total_matches) || 0,
        scheduledMatches: Number(row.scheduled_matches) || 0,
        completedMatches: Number(row.completed_matches) || 0,
        cancelledMatches: Number(row.cancelled_matches) || 0,
        avgParticipants: Number(row.avg_participants) || 0,
      };
    }

    return await getFallbackMatchStats(sportId, days);
  } catch (error) {
    console.error('Error in getMatchStatistics:', error);
    return await getFallbackMatchStats(sportId, days);
  }
}

/**
 * Fallback match stats using direct queries
 */
async function getFallbackMatchStats(
  sportId?: string,
  days: number = 30
): Promise<MatchStatistics> {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('match')
      .select('id, closed_at, cancelled_at', { count: 'exact' })
      .gte('created_at', startDate);

    if (sportId) {
      query = query.eq('sport_id', sportId);
    }

    const { data: matches, count } = await query;

    const stats = {
      totalMatches: count || 0,
      scheduledMatches: 0,
      completedMatches: 0,
      cancelledMatches: 0,
      avgParticipants: 2,
    };

    if (matches) {
      // Scheduled: not closed and not cancelled
      stats.scheduledMatches = matches.filter(m => !m.closed_at && !m.cancelled_at).length;
      // Completed: has closed_at and not cancelled
      stats.completedMatches = matches.filter(m => m.closed_at && !m.cancelled_at).length;
      // Cancelled: has cancelled_at
      stats.cancelledMatches = matches.filter(m => m.cancelled_at).length;
    }

    return stats;
  } catch (error) {
    console.error('Error in getFallbackMatchStats:', error);
    return {
      totalMatches: 0,
      scheduledMatches: 0,
      completedMatches: 0,
      cancelledMatches: 0,
      avgParticipants: 0,
    };
  }
}

/**
 * Get onboarding funnel statistics
 */
export async function getOnboardingFunnel(days: number = 30): Promise<OnboardingFunnelStep[]> {
  try {
    const { data, error } = await supabase.rpc('get_onboarding_funnel', {
      p_days: days,
    });

    if (error) {
      console.error('Error fetching onboarding funnel:', error);
      return getDefaultOnboardingFunnel();
    }

    if (data && data.length > 0) {
      return data.map((row: Record<string, unknown>) => ({
        screenName: String(row.screen_name || ''),
        totalViews: Number(row.total_views) || 0,
        completions: Number(row.completions) || 0,
        completionRate: Number(row.completion_rate) || 0,
        avgTimeSeconds: Number(row.avg_time_seconds) || 0,
      }));
    }

    return getDefaultOnboardingFunnel();
  } catch (error) {
    console.error('Error in getOnboardingFunnel:', error);
    return getDefaultOnboardingFunnel();
  }
}

/**
 * Default onboarding funnel structure
 */
function getDefaultOnboardingFunnel(): OnboardingFunnelStep[] {
  return [
    { screenName: 'welcome', totalViews: 0, completions: 0, completionRate: 0, avgTimeSeconds: 0 },
    { screenName: 'personal_info', totalViews: 0, completions: 0, completionRate: 0, avgTimeSeconds: 0 },
    { screenName: 'sport_selection', totalViews: 0, completions: 0, completionRate: 0, avgTimeSeconds: 0 },
    { screenName: 'skill_level', totalViews: 0, completions: 0, completionRate: 0, avgTimeSeconds: 0 },
    { screenName: 'availability', totalViews: 0, completions: 0, completionRate: 0, avgTimeSeconds: 0 },
    { screenName: 'location', totalViews: 0, completions: 0, completionRate: 0, avgTimeSeconds: 0 },
    { screenName: 'complete', totalViews: 0, completions: 0, completionRate: 0, avgTimeSeconds: 0 },
  ];
}

/**
 * Get sport-specific statistics
 */
export async function getSportStatistics(): Promise<SportStatistics[]> {
  try {
    // Get all sports
    const { data: sports, error: sportsError } = await supabase
      .from('sport')
      .select('id, name, slug')
      .order('name');

    if (sportsError || !sports) {
      console.error('Error fetching sports:', sportsError);
      return [];
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const stats: SportStatistics[] = [];

    for (const sport of sports) {
      // Get player count for sport
      const { count: playerCount } = await supabase
        .from('player_sport')
        .select('id', { count: 'exact', head: true })
        .eq('sport_id', sport.id);

      // Get matches created
      const { count: matchesCreated } = await supabase
        .from('match')
        .select('id', { count: 'exact', head: true })
        .eq('sport_id', sport.id);

      // Get matches completed
      const { count: matchesCompleted } = await supabase
        .from('match')
        .select('id', { count: 'exact', head: true })
        .eq('sport_id', sport.id)
        .not('closed_at', 'is', null);

      // Get active players this week (approximate)
      const { count: activePlayers } = await supabase
        .from('match_participant')
        .select('player_id', { count: 'exact', head: true })
        .gte('created_at', weekAgo);

      stats.push({
        sportId: sport.id,
        sportName: sport.name,
        totalPlayers: playerCount || 0,
        matchesCreated: matchesCreated || 0,
        matchesCompleted: matchesCompleted || 0,
        activePlayersWeek: activePlayers || 0,
      });
    }

    return stats;
  } catch (error) {
    console.error('Error in getSportStatistics:', error);
    return [];
  }
}

/**
 * Get metric trend data
 */
export async function getMetricTrend(
  metricType: string,
  metricName: string,
  days: number = 7,
  sportId?: string
): Promise<MetricTrendPoint[]> {
  try {
    const { data, error } = await supabase.rpc('get_metric_trend', {
      p_metric_type: metricType,
      p_metric_name: metricName,
      p_days: days,
      p_sport_id: sportId || null,
    });

    if (error) {
      console.error('Error fetching metric trend:', error);
      return [];
    }

    if (data) {
      return data.map((row: Record<string, unknown>) => ({
        date: String(row.snapshot_date || ''),
        value: Number(row.metric_value) || 0,
      }));
    }

    return [];
  } catch (error) {
    console.error('Error in getMetricTrend:', error);
    return [];
  }
}

/**
 * Get full KPI summary for dashboard
 */
export async function getKPISummary(): Promise<KPISummary> {
  try {
    const [users, matches, sportStats, onboardingFunnel] = await Promise.all([
      getRealtimeUserStats(),
      getMatchStatistics(),
      getSportStatistics(),
      getOnboardingFunnel(),
    ]);

    return {
      users,
      matches,
      sportStats,
      onboardingFunnel,
    };
  } catch (error) {
    console.error('Error in getKPISummary:', error);
    return {
      users: {
        totalUsers: 0,
        activeToday: 0,
        activeWeek: 0,
        activeMonth: 0,
        newToday: 0,
        newWeek: 0,
      },
      matches: {
        totalMatches: 0,
        scheduledMatches: 0,
        completedMatches: 0,
        cancelledMatches: 0,
        avgParticipants: 0,
      },
      sportStats: [],
      onboardingFunnel: getDefaultOnboardingFunnel(),
    };
  }
}

/**
 * Get analytics snapshots for a date range
 */
export async function getAnalyticsSnapshots(params: {
  startDate: string;
  endDate: string;
  metricType?: string;
  sportId?: string;
}): Promise<AnalyticsSnapshot[]> {
  try {
    let query = supabase
      .from('analytics_snapshot')
      .select('*')
      .gte('snapshot_date', params.startDate)
      .lte('snapshot_date', params.endDate)
      .order('snapshot_date', { ascending: false });

    if (params.metricType) {
      query = query.eq('metric_type', params.metricType);
    }

    if (params.sportId) {
      query = query.eq('sport_id', params.sportId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching analytics snapshots:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      snapshotDate: row.snapshot_date,
      sportId: row.sport_id,
      metricType: row.metric_type,
      metricName: row.metric_name,
      metricValue: row.metric_value,
      metricMetadata: row.metric_metadata || {},
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error('Error in getAnalyticsSnapshots:', error);
    return [];
  }
}

/**
 * Build dashboard widgets from KPI data
 */
export function buildDashboardWidgets(kpi: KPISummary): DashboardWidget[] {
  const widgets: DashboardWidget[] = [];

  // Total Users widget
  widgets.push({
    id: 'total-users',
    title: 'Total Users',
    type: 'number',
    value: kpi.users.totalUsers,
    change: kpi.users.newWeek,
    changeType: kpi.users.newWeek > 0 ? 'increase' : 'neutral',
  });

  // Active Users widget
  widgets.push({
    id: 'active-users',
    title: 'Monthly Active Users',
    type: 'number',
    value: kpi.users.activeMonth,
    change: Math.round((kpi.users.activeMonth / Math.max(kpi.users.totalUsers, 1)) * 100),
    changeType: 'neutral',
  });

  // New Users widget
  widgets.push({
    id: 'new-users',
    title: 'New Users (Week)',
    type: 'number',
    value: kpi.users.newWeek,
    change: kpi.users.newToday,
    changeType: kpi.users.newToday > 0 ? 'increase' : 'neutral',
  });

  // Total Matches widget
  widgets.push({
    id: 'total-matches',
    title: 'Matches (30d)',
    type: 'number',
    value: kpi.matches.totalMatches,
  });

  // Completion Rate widget
  const completionRate = kpi.matches.totalMatches > 0
    ? Math.round((kpi.matches.completedMatches / kpi.matches.totalMatches) * 100)
    : 0;
  widgets.push({
    id: 'completion-rate',
    title: 'Match Completion Rate',
    type: 'percentage',
    value: `${completionRate}%`,
    changeType: completionRate >= 70 ? 'increase' : completionRate >= 50 ? 'neutral' : 'decrease',
  });

  // Sport-specific widgets
  for (const sport of kpi.sportStats) {
    widgets.push({
      id: `sport-${sport.sportId}`,
      title: `${sport.sportName} Players`,
      type: 'number',
      value: sport.totalPlayers,
    });
  }

  return widgets;
}

export default {
  getRealtimeUserStats,
  getMatchStatistics,
  getOnboardingFunnel,
  getSportStatistics,
  getMetricTrend,
  getKPISummary,
  getAnalyticsSnapshots,
  buildDashboardWidgets,
};
