/**
 * Report Service
 * Handles user reporting functionality
 */

import { supabase } from '../supabase';

// Report reasons matching the database enum
export type ReportReason = 
  | 'inappropriate_behavior'
  | 'harassment'
  | 'spam'
  | 'cheating'
  | 'other';

// Labels for display
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  inappropriate_behavior: 'Inappropriate Behavior',
  harassment: 'Harassment',
  spam: 'Spam',
  cheating: 'Cheating',
  other: 'Other',
};

export interface CreateReportParams {
  reporterId: string;
  reportedId: string;
  reason: ReportReason;
  description?: string;
  matchId?: string;
  conversationId?: string;
}

/**
 * Submit a report against another user
 */
export async function createReport(params: CreateReportParams): Promise<void> {
  const { reporterId, reportedId, reason, description, matchId } = params;

  // Don't allow self-reporting
  if (reporterId === reportedId) {
    throw new Error('You cannot report yourself');
  }

  // Check if already reported this user recently (within 24 hours)
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const { data: existingReport } = await supabase
    .from('report')
    .select('id')
    .eq('reporter_id', reporterId)
    .eq('reported_id', reportedId)
    .gte('created_at', oneDayAgo.toISOString())
    .maybeSingle();

  if (existingReport) {
    throw new Error('You have already reported this user recently');
  }

  const { error } = await supabase
    .from('report')
    .insert({
      reporter_id: reporterId,
      reported_id: reportedId,
      reason,
      description: description || null,
      match_id: matchId || null,
      status: 'pending',
    });

  if (error) {
    console.error('Error creating report:', error);
    throw new Error('Failed to submit report. Please try again.');
  }
}

/**
 * Get all reports made by a user (for viewing report history)
 */
export async function getMyReports(playerId: string) {
  const { data, error } = await supabase
    .from('report')
    .select(`
      id,
      reported_id,
      reason,
      description,
      status,
      created_at,
      reported:reported_id (
        id,
        profile (
          first_name,
          last_name,
          profile_picture_url
        )
      )
    `)
    .eq('reporter_id', playerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reports:', error);
    throw new Error('Failed to fetch reports');
  }

  return data;
}
