/**
 * Feedback Service
 * Handles user feedback/suggestion submissions
 */

import { supabase } from '../supabase';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

// Feedback categories matching the database check constraint
export type FeedbackCategory = 'bug' | 'feature' | 'improvement' | 'other';

// Labels for display (for UI reference)
export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  improvement: 'Improvement',
  other: 'Other',
};

// Feedback status for reference (managed by admins)
export type FeedbackStatus = 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'closed';

export interface FeedbackSubmission {
  id: string;
  player_id: string | null;
  category: FeedbackCategory;
  subject: string;
  message: string;
  app_version: string | null;
  device_info: Record<string, unknown> | null;
  screenshot_urls: string[] | null;
  status: FeedbackStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFeedbackParams {
  playerId?: string;
  category: FeedbackCategory;
  subject: string;
  message: string;
  screenshotUrls?: string[];
}

/**
 * Get device information for feedback context
 */
function getDeviceInfo(): Record<string, unknown> {
  return {
    platform: Platform.OS,
    platformVersion: Platform.Version,
    // Add more device info as needed
  };
}

/**
 * Get app version
 */
function getAppVersion(): string | null {
  try {
    return Application.nativeApplicationVersion || null;
  } catch {
    return null;
  }
}

/**
 * Submit new feedback
 */
export async function submitFeedback(params: CreateFeedbackParams): Promise<FeedbackSubmission> {
  const { playerId, category, subject, message, screenshotUrls } = params;

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      player_id: playerId || null,
      category,
      subject,
      message,
      app_version: getAppVersion(),
      device_info: getDeviceInfo(),
      screenshot_urls: screenshotUrls || [],
      status: 'new',
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting feedback:', error);
    throw new Error('Failed to submit feedback. Please try again.');
  }

  // Fetch user details for the email notification
  let playerName: string | null = null;
  let playerEmail: string | null = null;

  if (playerId) {
    try {
      const { data: profile } = await supabase
        .from('player')
        .select('first_name, last_name, display_name, email')
        .eq('id', playerId)
        .single();

      if (profile) {
        playerName = profile.display_name || 
          [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 
          null;
        playerEmail = profile.email || null;
      }
    } catch {
      // Continue without user details if fetch fails
    }
  }

  // Trigger email notification via Edge Function
  try {
    await sendFeedbackNotification(data, playerName, playerEmail);
  } catch (notifyError) {
    // Don't fail the submission if notification fails
    console.error('Failed to send feedback notification:', notifyError);
  }

  return data;
}

/**
 * Send email notification to admin about new feedback
 */
async function sendFeedbackNotification(
  feedback: FeedbackSubmission,
  playerName: string | null,
  playerEmail: string | null
): Promise<void> {
  const { error } = await supabase.functions.invoke('send-feedback-notification', {
    body: {
      feedback_id: feedback.id,
      category: feedback.category,
      subject: feedback.subject,
      message: feedback.message,
      player_id: feedback.player_id,
      player_name: playerName,
      player_email: playerEmail,
      app_version: feedback.app_version,
      device_info: feedback.device_info,
      screenshot_urls: feedback.screenshot_urls || [],
      created_at: feedback.created_at,
    },
  });

  if (error) {
    throw error;
  }
}

/**
 * Get user's feedback history
 */
export async function getUserFeedback(playerId: string): Promise<FeedbackSubmission[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user feedback:', error);
    throw new Error('Failed to fetch feedback history.');
  }

  return data || [];
}

/**
 * Get a single feedback submission by ID
 */
export async function getFeedbackById(feedbackId: string, playerId: string): Promise<FeedbackSubmission | null> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('id', feedbackId)
    .eq('player_id', playerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching feedback:', error);
    throw new Error('Failed to fetch feedback.');
  }

  return data;
}
