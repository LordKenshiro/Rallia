import { StyleSheet } from 'react-native';
import { COLORS } from '../constants';

/**
 * Common button styles used throughout the app
 */
export const buttonStyles = StyleSheet.create({
  // Primary button (main actions)
  primary: {
    backgroundColor: COLORS.buttonPrimary,
    borderRadius: 10,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.black,
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
    backgroundColor: COLORS.buttonDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  
  // Primary button text
  primaryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Disabled button text
  disabledText: {
    color: COLORS.gray,
  },
  
  // Secondary button (light background)
  secondary: {
    backgroundColor: COLORS.accentLighter,
    borderRadius: 10,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Secondary button text
  secondaryText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Small rounded button
  small: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
  },
  
  // Small button text
  smallText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },

  // Social auth button (square icon button)
  social: {
    width: 70,
    height: 50,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

/**
 * Common input field styles
 */
export const inputStyles = StyleSheet.create({
  // Standard text input
  input: {
    backgroundColor: COLORS.veryLightGray,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: COLORS.dark,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  
  // Input with icon on the right
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.veryLightGray,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  
  // Input field inside inputWithIcon
  inputField: {
    flex: 1,
    fontSize: 16,
    color: COLORS.dark,
  },
  
  // Text style for inputs (used with TouchableOpacity as input)
  inputText: {
    paddingVertical: 0,
  },
  
  // Placeholder text color
  placeholderText: {
    color: COLORS.gray,
  },
  
  // Icon inside input
  inputIcon: {
    marginLeft: 10,
  },
});

/**
 * Common card/container styles
 */
export const containerStyles = StyleSheet.create({
  // Standard card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
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
    backgroundColor: COLORS.white,
    padding: 20,
    margin: 16,
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
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
