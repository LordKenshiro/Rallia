/**
 * Button Component
 * 
 * A versatile button component with multiple variants, sizes, and states.
 * Supports loading states, icons, and full-width layout.
 * 
 * @example
 * ```tsx
 * // Primary button
 * <Button onPress={() => console.log('Pressed')}>
 *   Click Me
 * </Button>
 * 
 * // Secondary button with icon
 * <Button variant="secondary" leftIcon={<Icon name="check" />}>
 *   Save
 * </Button>
 * 
 * // Loading state
 * <Button loading>
 *   Submitting...
 * </Button>
 * ```
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';

export interface ButtonProps {
  /** Button style variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  /** Button size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Disabled state */
  disabled?: boolean;
  /** Loading state (shows spinner) */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Press handler */
  onPress?: () => void;
  /** Icon to show on left side */
  leftIcon?: React.ReactNode;
  /** Icon to show on right side */
  rightIcon?: React.ReactNode;
  /** Button text/content */
  children: React.ReactNode;
  /** Additional container styles */
  style?: ViewStyle;
  /** Additional text styles */
  textStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onPress,
  leftIcon,
  rightIcon,
  children,
  style,
  textStyle,
  testID,
}) => {
  const isDisabled = disabled || loading;

  // Get variant styles
  const variantStyles = getVariantStyles(variant, isDisabled);
  
  // Get size styles
  const sizeStyles = getSizeStyles(size);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      testID={testID}
      style={[
        styles.container,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variantStyles.spinner}
          style={styles.spinner}
        />
      )}
      
      {!loading && leftIcon && (
        <View style={styles.leftIcon}>{leftIcon}</View>
      )}
      
      <Text
        style={[
          styles.text,
          variantStyles.text,
          sizeStyles.text,
          isDisabled && variantStyles.textDisabled,
          textStyle,
        ]}
      >
        {children}
      </Text>
      
      {!loading && rightIcon && (
        <View style={styles.rightIcon}>{rightIcon}</View>
      )}
    </TouchableOpacity>
  );
};

// Variant styles
const getVariantStyles = (variant: ButtonProps['variant'], disabled: boolean) => {
  const variants = {
    primary: {
      container: {
        backgroundColor: disabled ? colors.buttonDisabled : colors.primary,
      },
      text: {
        color: colors.white,
      },
      textDisabled: {
        color: colors.gray,
      },
      spinner: colors.white,
    },
    secondary: {
      container: {
        backgroundColor: disabled ? colors.veryLightGray : colors.white,
        borderWidth: 2,
        borderColor: disabled ? colors.lightGray : colors.primary,
      },
      text: {
        color: colors.primary,
      },
      textDisabled: {
        color: colors.gray,
      },
      spinner: colors.primary,
    },
    outline: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled ? colors.lightGray : colors.lightGray,
      },
      text: {
        color: colors.dark,
      },
      textDisabled: {
        color: colors.gray,
      },
      spinner: colors.dark,
    },
    ghost: {
      container: {
        backgroundColor: 'transparent',
      },
      text: {
        color: colors.primary,
      },
      textDisabled: {
        color: colors.gray,
      },
      spinner: colors.primary,
    },
    link: {
      container: {
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
      },
      text: {
        color: colors.primary,
        textDecorationLine: 'underline' as const,
      },
      textDisabled: {
        color: colors.gray,
      },
      spinner: colors.primary,
    },
  };

  return variants[variant || 'primary'];
};

// Size styles
const getSizeStyles = (size: ButtonProps['size']) => {
  const sizes = {
    xs: {
      container: {
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[1],
        minHeight: 28,
      },
      text: {
        fontSize: typography.fontSize.xs,
      },
    },
    sm: {
      container: {
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[2],
        minHeight: 32,
      },
      text: {
        fontSize: typography.fontSize.sm,
      },
    },
    md: {
      container: {
        paddingHorizontal: spacing[5],
        paddingVertical: spacing[3],
        minHeight: 40,
      },
      text: {
        fontSize: typography.fontSize.base,
      },
    },
    lg: {
      container: {
        paddingHorizontal: spacing[6],
        paddingVertical: spacing[4],
        minHeight: 48,
      },
      text: {
        fontSize: typography.fontSize.lg,
      },
    },
    xl: {
      container: {
        paddingHorizontal: spacing[8],
        paddingVertical: spacing[5],
        minHeight: 56,
      },
      text: {
        fontSize: typography.fontSize.xl,
      },
    },
  };

  return sizes[size || 'md'];
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.base,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  spinner: {
    marginRight: spacing[2],
  },
  leftIcon: {
    marginRight: spacing[2],
  },
  rightIcon: {
    marginLeft: spacing[2],
  },
});
