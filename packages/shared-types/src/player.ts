/**
 * Player-related types for sport preferences and profiles
 */

/**
 * Play styles used in tennis and pickleball
 */
export type PlayStyle = 
  | 'counterpuncher' 
  | 'aggressive_baseliner' 
  | 'serve_and_volley' 
  | 'all_court';

/**
 * Play attributes/strengths for player profiles
 */
export type PlayAttribute = 
  | 'serve_speed_and_placement' 
  | 'net_play' 
  | 'court_coverage' 
  | 'forehand_power' 
  | 'shot_selection' 
  | 'spin_control';

/**
 * Player sport preferences information
 */
export interface PreferencesInfo {
  /** Preferred match duration (e.g., '1h', '1.5h', '2h') */
  matchDuration?: string;
  
  /** Preferred match type (e.g., 'Casual', 'Competitive', 'Both') */
  matchType?: string;
  
  /** Preferred court location/name */
  court?: string;
  
  /** Player's preferred play style */
  playStyle?: PlayStyle;
  
  /** Player's key attributes/strengths */
  playAttributes?: PlayAttribute[];
}

/**
 * Human-readable labels for play styles
 */
export const PLAY_STYLE_LABELS: Record<PlayStyle, string> = {
  counterpuncher: 'Counterpuncher',
  aggressive_baseliner: 'Aggressive Baseliner',
  serve_and_volley: 'Serve and Volley',
  all_court: 'All Court',
};

/**
 * Human-readable labels for play attributes
 */
export const PLAY_ATTRIBUTE_LABELS: Record<PlayAttribute, string> = {
  serve_speed_and_placement: 'Serve Speed & Placement',
  net_play: 'Net Play',
  court_coverage: 'Court Coverage',
  forehand_power: 'Forehand Power',
  shot_selection: 'Shot Selection',
  spin_control: 'Spin Control',
};
