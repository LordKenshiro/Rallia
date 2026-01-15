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
  ExtendedNotificationTypeEnum,
  DeliveryChannelEnum,
  NotificationPriorityEnum,
  // Match Creation enums
  MatchFormatEnum,
  CourtStatusEnum,
  MatchVisibilityEnum,
  MatchJoinModeEnum,
  CostSplitTypeEnum,
  LocationTypeEnum,
  MatchDurationEnum,
  MatchTypeEnum,
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
 * Human-readable labels for match durations (using match_duration_enum)
 * @deprecated Use MATCH_DURATION_ENUM_LABELS instead
 */
export const MATCH_DURATION_LABELS: Record<MatchDuration, string> = {
  '30': '30 Minutes',
  '60': '1 Hour',
  '90': '1.5 Hours',
  '120': '2 Hours',
  custom: 'Custom',
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
export const NOTIFICATION_TYPE_ICONS: Record<ExtendedNotificationTypeEnum, string> = {
  // Original types
  match_invitation: 'calendar-outline',
  reminder: 'alarm-outline',
  payment: 'card-outline',
  support: 'help-circle-outline',
  chat: 'chatbubble-outline',
  system: 'information-circle-outline',
  // Match lifecycle types
  match_join_request: 'person-add-outline',
  match_join_accepted: 'checkmark-circle-outline',
  match_join_rejected: 'close-circle-outline',
  match_player_joined: 'person-add-outline',
  match_cancelled: 'calendar-clear-outline',
  match_updated: 'create-outline',
  match_starting_soon: 'time-outline',
  match_completed: 'trophy-outline',
  player_kicked: 'remove-circle-outline',
  player_left: 'exit-outline',
  // Social types
  new_message: 'chatbubble-ellipses-outline',
  friend_request: 'people-outline',
  rating_verified: 'ribbon-outline',
  // Feedback types
  feedback_request: 'star-outline',
};

/**
 * Color mapping for notification types
 */
export const NOTIFICATION_TYPE_COLORS: Record<ExtendedNotificationTypeEnum, string> = {
  // Original types
  match_invitation: '#4DB8A8', // Teal
  reminder: '#FF9800', // Orange
  payment: '#4CAF50', // Green
  support: '#2196F3', // Blue
  chat: '#9C27B0', // Purple
  system: '#607D8B', // Blue Grey
  // Match lifecycle types
  match_join_request: '#4DB8A8', // Teal
  match_join_accepted: '#4CAF50', // Green
  match_join_rejected: '#F44336', // Red
  match_player_joined: '#4CAF50', // Green
  match_cancelled: '#F44336', // Red
  match_updated: '#2196F3', // Blue
  match_starting_soon: '#FF9800', // Orange
  match_completed: '#4CAF50', // Green
  player_kicked: '#F44336', // Red
  player_left: '#FF9800', // Orange
  // Social types
  new_message: '#9C27B0', // Purple
  friend_request: '#4DB8A8', // Teal
  rating_verified: '#4CAF50', // Green
  // Feedback types
  feedback_request: '#FFC107', // Amber
};

/**
 * Human-readable labels for notification types
 */
export const NOTIFICATION_TYPE_LABELS: Record<ExtendedNotificationTypeEnum, string> = {
  match_invitation: 'Match Invitation',
  reminder: 'Reminder',
  payment: 'Payment',
  support: 'Support',
  chat: 'Chat',
  system: 'System',
  match_join_request: 'Join Request',
  match_join_accepted: 'Request Accepted',
  match_join_rejected: 'Request Rejected',
  match_player_joined: 'Player Joined',
  match_cancelled: 'Match Cancelled',
  match_updated: 'Match Updated',
  match_starting_soon: 'Match Starting Soon',
  match_completed: 'Match Completed',
  player_kicked: 'Removed from Match',
  player_left: 'Player Left',
  new_message: 'New Message',
  friend_request: 'Friend Request',
  rating_verified: 'Rating Verified',
  feedback_request: 'Feedback Request',
};

/**
 * Notification type categories for grouping in preferences UI
 */
export type NotificationCategory = 'match' | 'social' | 'system';

export const NOTIFICATION_TYPE_CATEGORIES: Record<
  ExtendedNotificationTypeEnum,
  NotificationCategory
> = {
  // Match category
  match_invitation: 'match',
  match_join_request: 'match',
  match_join_accepted: 'match',
  match_join_rejected: 'match',
  match_player_joined: 'match',
  match_cancelled: 'match',
  match_updated: 'match',
  match_starting_soon: 'match',
  match_completed: 'match',
  player_kicked: 'match',
  player_left: 'match',
  // Social category
  chat: 'social',
  new_message: 'social',
  friend_request: 'social',
  rating_verified: 'social',
  // System category
  reminder: 'system',
  payment: 'system',
  support: 'system',
  system: 'system',
  // Feedback (match-related)
  feedback_request: 'match',
};

/**
 * Labels for notification categories
 */
export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  match: 'Match Notifications',
  social: 'Social Notifications',
  system: 'System Notifications',
};

/**
 * Labels for delivery channels
 */
export const DELIVERY_CHANNEL_LABELS: Record<DeliveryChannelEnum, string> = {
  email: 'Email',
  push: 'Push',
  sms: 'SMS',
};

/**
 * Icons for delivery channels (Ionicons names)
 */
export const DELIVERY_CHANNEL_ICONS: Record<DeliveryChannelEnum, string> = {
  email: 'mail-outline',
  push: 'notifications-outline',
  sms: 'chatbox-outline',
};

/**
 * Labels for notification priority
 */
export const NOTIFICATION_PRIORITY_LABELS: Record<NotificationPriorityEnum, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

/**
 * Default notification preferences matrix
 * Used when user has no explicit preference set
 * Key: notification type, Value: { channel: enabled }
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Record<
  ExtendedNotificationTypeEnum,
  Record<DeliveryChannelEnum, boolean>
> = {
  // Match types - email and push on, sms off by default
  match_invitation: { email: true, push: true, sms: false },
  match_join_request: { email: true, push: true, sms: false },
  match_join_accepted: { email: true, push: true, sms: false },
  match_join_rejected: { email: true, push: true, sms: false },
  match_player_joined: { email: false, push: true, sms: false }, // Push only for player joins
  match_cancelled: { email: true, push: true, sms: true }, // SMS for cancellations
  match_updated: { email: false, push: true, sms: false },
  match_starting_soon: { email: false, push: true, sms: true }, // SMS for reminders
  match_completed: { email: false, push: true, sms: false },
  player_kicked: { email: true, push: true, sms: false },
  player_left: { email: false, push: true, sms: false }, // Push only for player leaves
  // Social types - push only by default
  chat: { email: false, push: true, sms: false },
  new_message: { email: false, push: true, sms: false },
  friend_request: { email: false, push: true, sms: false },
  rating_verified: { email: true, push: true, sms: false },
  // System types - email only by default
  reminder: { email: false, push: true, sms: false },
  payment: { email: true, push: true, sms: false },
  support: { email: true, push: false, sms: false },
  system: { email: true, push: false, sms: false },
  // Feedback types
  feedback_request: { email: false, push: true, sms: false },
};

// ============================================
// MATCH CREATION - NEW ENUMS
// ============================================

/**
 * Human-readable labels for match format (singles/doubles)
 */
export const MATCH_FORMAT_LABELS: Record<MatchFormatEnum, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
};

/**
 * Descriptions for match formats
 */
export const MATCH_FORMAT_DESCRIPTIONS: Record<MatchFormatEnum, string> = {
  singles: '1 vs 1 match',
  doubles: '2 vs 2 match with teams',
};

/**
 * Human-readable labels for court reservation status
 */
export const COURT_STATUS_LABELS: Record<CourtStatusEnum, string> = {
  reserved: 'Court Reserved',
  to_reserve: 'Court To Reserve',
};

/**
 * Descriptions for court status
 */
export const COURT_STATUS_DESCRIPTIONS: Record<CourtStatusEnum, string> = {
  reserved: 'The court has already been booked',
  to_reserve: 'The court still needs to be reserved',
};

/**
 * Human-readable labels for match visibility
 */
export const MATCH_VISIBILITY_LABELS: Record<MatchVisibilityEnum, string> = {
  public: 'Public',
  private: 'Private',
};

/**
 * Descriptions for match visibility
 */
export const MATCH_VISIBILITY_DESCRIPTIONS: Record<MatchVisibilityEnum, string> = {
  public: 'Anyone can discover and join this match',
  private: 'Only invited players can see this match',
};

/**
 * Human-readable labels for match join mode
 */
export const MATCH_JOIN_MODE_LABELS: Record<MatchJoinModeEnum, string> = {
  direct: 'Join Directly',
  request: 'Request to Join',
};

/**
 * Descriptions for match join mode
 */
export const MATCH_JOIN_MODE_DESCRIPTIONS: Record<MatchJoinModeEnum, string> = {
  direct: 'Players can join immediately without approval',
  request: 'Players must request to join and wait for approval',
};

/**
 * Human-readable labels for cost split type
 */
export const COST_SPLIT_TYPE_LABELS: Record<CostSplitTypeEnum, string> = {
  host_pays: 'Host Pays',
  split_equal: 'Split Equally',
  custom: 'Custom Split',
};

/**
 * Descriptions for cost split types
 */
export const COST_SPLIT_TYPE_DESCRIPTIONS: Record<CostSplitTypeEnum, string> = {
  host_pays: 'The match host covers all court costs',
  split_equal: 'Court costs are split equally between all players',
  custom: 'Custom arrangement for splitting costs',
};

/**
 * Human-readable labels for location type
 */
export const LOCATION_TYPE_LABELS: Record<LocationTypeEnum, string> = {
  facility: 'Select Facility',
  custom: 'Custom Location',
  tbd: 'To Be Determined',
};

/**
 * Descriptions for location types
 */
export const LOCATION_TYPE_DESCRIPTIONS: Record<LocationTypeEnum, string> = {
  facility: 'Choose from available facilities and courts',
  custom: 'Enter a custom location address',
  tbd: 'Location will be decided later',
};

/**
 * Human-readable labels for match duration (using match_duration_enum)
 */
export const MATCH_DURATION_ENUM_LABELS: Record<MatchDurationEnum, string> = {
  '30': '30 Minutes',
  '60': '1 Hour',
  '90': '1.5 Hours',
  '120': '2 Hours',
  custom: 'Custom Duration',
};

/**
 * Human-readable labels for match type enum (practice/competitive/both)
 * Used for player expectation in match creation
 */
export const MATCH_TYPE_ENUM_LABELS: Record<MatchTypeEnum, string> = {
  casual: 'Casual',
  competitive: 'Competitive',
  both: 'Either',
};

/**
 * Descriptions for match type enum (player expectation)
 */
export const MATCH_TYPE_ENUM_DESCRIPTIONS: Record<MatchTypeEnum, string> = {
  casual: 'Casual hitting, rallying, or practice session',
  competitive: 'A real match with scoring and competition',
  both: 'Open to either practice or competitive play',
};

/**
 * Derived match status type (not stored in DB, computed from cancelled_at and match_result)
 * This is a UI-only type for displaying match status
 */
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

/**
 * Human-readable labels for match status
 * Note: Match status is now derived from cancelled_at and match_result, not stored as an enum
 */
export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

/**
 * Icon mapping for match status (Ionicons names)
 */
export const MATCH_STATUS_ICONS: Record<MatchStatus, string> = {
  scheduled: 'calendar-outline',
  in_progress: 'play-circle-outline',
  completed: 'checkmark-circle-outline',
  cancelled: 'close-circle-outline',
  no_show: 'alert-circle-outline',
};

/**
 * Color mapping for match status
 */
export const MATCH_STATUS_COLORS: Record<MatchStatus, string> = {
  scheduled: '#2196F3', // Blue
  in_progress: '#FF9800', // Orange
  completed: '#4CAF50', // Green
  cancelled: '#F44336', // Red
  no_show: '#9E9E9E', // Grey
};
