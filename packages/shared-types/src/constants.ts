/**
 * Domain Constants - Display Labels and Mappings
 *
 * This file contains constants for display labels and human-readable
 * mappings for enum values. These are UI presentation concerns.
 */

import type {
  PlayStyleEnum,
  PlayAttributeEnum,
  SkillLevel,
  MatchType,
  MatchDuration,
  DayOfWeek,
  TimePeriod,
  GenderType,
  CourtSurface,
  CourtType,
  NotificationTypeEnum,
} from './database';

// ============================================
// PLAY STYLE
// ============================================

/**
 * Human-readable labels for play styles
 */
export const PLAY_STYLE_LABELS: Record<PlayStyleEnum, string> = {
  counterpuncher: 'Counterpuncher',
  aggressive_baseliner: 'Aggressive Baseliner',
  serve_and_volley: 'Serve and Volley',
  all_court: 'All Court',
};

/**
 * Descriptions for play styles
 */
export const PLAY_STYLE_DESCRIPTIONS: Record<PlayStyleEnum, string> = {
  counterpuncher: 'Defensive player who retrieves and waits for opponent errors',
  aggressive_baseliner: 'Plays from the baseline with powerful groundstrokes',
  serve_and_volley: 'Rushes the net after serving to finish points quickly',
  all_court: 'Versatile player comfortable in all areas of the court',
};

// ============================================
// PLAY ATTRIBUTES
// ============================================

/**
 * Human-readable labels for play attributes
 */
export const PLAY_ATTRIBUTE_LABELS: Record<PlayAttributeEnum, string> = {
  serve_speed_and_placement: 'Serve Speed & Placement',
  net_play: 'Net Play',
  court_coverage: 'Court Coverage',
  forehand_power: 'Forehand Power',
  shot_selection: 'Shot Selection',
  spin_control: 'Spin Control',
};

// ============================================
// SKILL LEVEL
// ============================================

/**
 * Human-readable labels for skill levels
 */
export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  professional: 'Professional',
};

/**
 * Descriptions for skill levels
 */
export const SKILL_LEVEL_DESCRIPTIONS: Record<SkillLevel, string> = {
  beginner: 'New to the sport or learning fundamentals',
  intermediate: 'Comfortable with basic strokes and strategy',
  advanced: 'Strong all-around game with competitive experience',
  professional: 'Tournament-level player with elite skills',
};

// ============================================
// MATCH TYPE
// ============================================

/**
 * Human-readable labels for match types
 */
export const MATCH_TYPE_LABELS: Record<MatchType, string> = {
  casual: 'Casual',
  competitive: 'Competitive',
  both: 'Both',
};

/**
 * Descriptions for match types
 */
export const MATCH_TYPE_DESCRIPTIONS: Record<MatchType, string> = {
  casual: 'Relaxed play for fun and exercise',
  competitive: 'Serious play with score keeping',
  both: 'Open to either casual or competitive play',
};

// ============================================
// MATCH DURATION
// ============================================

/**
 * Human-readable labels for match durations
 */
export const MATCH_DURATION_LABELS: Record<MatchDuration, string> = {
  '1h': '1 Hour',
  '1.5h': '1.5 Hours',
  '2h': '2 Hours',
};

// ============================================
// DAYS OF WEEK
// ============================================

/**
 * Human-readable labels for days of week
 */
export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

/**
 * Short labels for days of week
 */
export const DAY_OF_WEEK_SHORT_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

/**
 * Ordered list of days for iteration
 */
export const DAYS_OF_WEEK_ORDERED: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

// ============================================
// TIME PERIOD
// ============================================

/**
 * Human-readable labels for time periods
 */
export const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

/**
 * Time ranges for each period
 */
export const TIME_PERIOD_RANGES: Record<TimePeriod, string> = {
  morning: '6am - 12pm',
  afternoon: '12pm - 5pm',
  evening: '5pm - 9pm',
  night: '9pm - 12am',
};

/**
 * Ordered list of time periods for iteration
 */
export const TIME_PERIODS_ORDERED: TimePeriod[] = ['morning', 'afternoon', 'evening', 'night'];

// ============================================
// GENDER
// ============================================

/**
 * Human-readable labels for gender types
 */
export const GENDER_LABELS: Record<GenderType, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

// ============================================
// COURT
// ============================================

/**
 * Human-readable labels for court surfaces
 */
export const COURT_SURFACE_LABELS: Record<CourtSurface, string> = {
  hard: 'Hard Court',
  clay: 'Clay Court',
  grass: 'Grass Court',
  carpet: 'Carpet',
  synthetic: 'Synthetic',
};

/**
 * Human-readable labels for court types
 */
export const COURT_TYPE_LABELS: Record<CourtType, string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  covered: 'Covered',
};

// ============================================
// SPORT NAMES
// ============================================

/**
 * Supported sports in the app
 */
export type SportName = 'tennis' | 'pickleball';

/**
 * Display names for sports
 */
export const SPORT_DISPLAY_NAMES: Record<SportName, string> = {
  tennis: 'Tennis',
  pickleball: 'Pickleball',
};

// ============================================
// RATING SYSTEMS
// ============================================

/**
 * Rating system display names
 */
export const RATING_SYSTEM_NAMES = {
  ntrp: 'NTRP',
  utr: 'UTR',
  dupr: 'DUPR',
  self_assessment: 'Self Assessment',
} as const;

/**
 * Rating system full names
 */
export const RATING_SYSTEM_FULL_NAMES = {
  ntrp: 'National Tennis Rating Program',
  utr: 'Universal Tennis Rating',
  dupr: 'Dynamic Universal Pickleball Rating',
  self_assessment: 'Self Assessment',
} as const;

// ============================================
// NOTIFICATIONS
// ============================================

/**
 * Icon mapping for notification types (Ionicons names)
 */
export const NOTIFICATION_TYPE_ICONS: Record<NotificationTypeEnum, string> = {
  match_invitation: 'calendar-outline',
  reminder: 'alarm-outline',
  payment: 'card-outline',
  support: 'help-circle-outline',
  chat: 'chatbubble-outline',
  system: 'information-circle-outline',
};

/**
 * Color mapping for notification types
 */
export const NOTIFICATION_TYPE_COLORS: Record<NotificationTypeEnum, string> = {
  match_invitation: '#4DB8A8', // Teal
  reminder: '#FF9800', // Orange
  payment: '#4CAF50', // Green
  support: '#2196F3', // Blue
  chat: '#9C27B0', // Purple
  system: '#607D8B', // Blue Grey
};
