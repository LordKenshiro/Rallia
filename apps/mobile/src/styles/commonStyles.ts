import { StyleSheet } from 'react-native';
import { neutral, primary, status } from '@rallia/design-system';
import type { ThemeColors } from '@rallia/shared-hooks';

// Using string literals for base colors to avoid runtime import issues
const BASE_WHITE = '#ffffff';
const BASE_BLACK = '#000000';

/**
 * @deprecated Use useThemeStyles() hook and create styles dynamically
 * Common button styles - now theme-aware
 *
 * These functions return styles based on theme colors.
 * Prefer using useThemeStyles() hook directly in components.
 */
export const createButtonStyles = (colors: ThemeColors) => {
  return StyleSheet.create({
    // Primary button (main actions)
    primary: {
      backgroundColor: colors.buttonActive,
      borderRadius: 10,
      paddingVertical: 16,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: BASE_BLACK,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },

    // Disabled button state
    disabled: {
      backgroundColor: colors.buttonInactive,
      shadowOpacity: 0,
      elevation: 0,
    },

    // Primary button text
    primaryText: {
      color: colors.buttonTextActive,
      fontSize: 16,
      fontWeight: '600',
    },

    // Disabled button text
    disabledText: {
      color: colors.buttonTextInactive,
    },

    // Secondary button (light background)
    secondary: {
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      paddingVertical: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Secondary button text
    secondaryText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600',
    },

    // Small rounded button
    small: {
      backgroundColor: colors.primary,
      paddingHorizontal: 32,
      paddingVertical: 10,
      borderRadius: 20,
    },

    // Small button text
    smallText: {
      color: colors.buttonTextActive,
      fontSize: 14,
      fontWeight: '600',
    },

    // Social auth button (square icon button)
    social: {
      width: 70,
      height: 50,
      backgroundColor: colors.primary,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: BASE_BLACK,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  });
};

/**
 * @deprecated Use useThemeStyles() hook and create styles dynamically
 * Common input field styles - now theme-aware
 */
export const createInputStyles = (colors: ThemeColors) => {
  return StyleSheet.create({
    // Standard text input
    input: {
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      paddingHorizontal: 20,
      paddingVertical: 15,
      fontSize: 16,
      color: colors.text,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },

    // Input with icon on the right
    inputWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      paddingHorizontal: 20,
      paddingVertical: 15,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },

    // Input field inside inputWithIcon
    inputField: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },

    // Text style for inputs (used with TouchableOpacity as input)
    inputText: {
      paddingVertical: 0,
    },

    // Placeholder text color
    placeholderText: {
      color: colors.textMuted,
    },

    // Icon inside input
    inputIcon: {
      marginLeft: 10,
    },
  });
};

/**
 * @deprecated Use useThemeStyles() hook and create styles dynamically
 * Common card/container styles - now theme-aware
 */
export const createContainerStyles = (colors: ThemeColors) => {
  return StyleSheet.create({
    // Standard card
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 16,
      shadowColor: BASE_BLACK,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },

    // Section container
    section: {
      backgroundColor: colors.card,
      padding: 20,
      margin: 16,
      marginTop: 20,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
    },

    // Centered container
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};

// Legacy exports for backwards compatibility (deprecated)
// These use light theme defaults - components should use createButtonStyles() with theme colors instead
const lightThemeColors: ThemeColors = {
  // Core
  background: BASE_WHITE,
  foreground: neutral[950],

  // Surfaces
  card: BASE_WHITE,
  cardBackground: BASE_WHITE,
  cardForeground: neutral[950],

  // Text hierarchy
  text: neutral[950],
  textSecondary: neutral[600],
  textMuted: neutral[500],

  // Interactive
  primary: primary[600],
  primaryForeground: BASE_WHITE,
  buttonActive: primary[600],
  buttonInactive: neutral[300],
  buttonTextActive: BASE_WHITE,
  buttonTextInactive: neutral[500],

  // Borders
  border: neutral[200],
  borderFocus: primary[600],
  input: neutral[100],
  inputBorder: neutral[200],
  inputBorderFocused: primary[600],

  // Status
  error: status.error.DEFAULT,
  success: status.success.DEFAULT,
  warning: status.warning.DEFAULT,
  info: status.info.DEFAULT,

  // Header (app-specific)
  headerBackground: primary[100],
  headerForeground: neutral[900],

  // Icon colors
  icon: neutral[950],
  iconMuted: neutral[500],

  // Extended colors for overlays/wizards
  progressActive: primary[600],
  progressInactive: neutral[300],
  inputBackground: neutral[100],
  divider: neutral[200],
};

export const buttonStyles = createButtonStyles(lightThemeColors);
export const inputStyles = createInputStyles(lightThemeColors);
export const containerStyles = createContainerStyles(lightThemeColors);
