/**
 * Text Component
 * 
 * Foundational text component with consistent typography styles.
 * Uses theme tokens for sizes, weights, and spacing.
 * 
 * @example
 * ```tsx
 * <Text variant="body">Regular body text</Text>
 * <Text variant="caption" color={colors.gray}>Small caption text</Text>
 * <Text weight="bold" size="lg">Large bold text</Text>
 * ```
 */

import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';
import { colors } from '../theme';
import { typography } from '../theme';

export interface TextProps extends Omit<RNTextProps, 'style'> {
  /**
   * Predefined text variants for common use cases
   */
  variant?: 'body' | 'caption' | 'label';
  
  /**
   * Text color - defaults to theme text color
   */
  color?: string;
  
  /**
   * Font weight
   */
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  
  /**
   * Font size - use predefined sizes or custom
   */
  size?: keyof typeof typography.fontSize | number;
  
  /**
   * Text alignment
   */
  align?: 'left' | 'center' | 'right' | 'justify';
  
  /**
   * Line height multiplier
   */
  lineHeight?: 'tight' | 'normal' | 'relaxed';
  
  /**
   * Whether text should be italic
   */
  italic?: boolean;
  
  /**
   * Whether text should be underlined
   */
  underline?: boolean;
  
  /**
   * Whether text should be struck through
   */
  strikethrough?: boolean;
  
  /**
   * Custom style overrides
   */
  style?: TextStyle | TextStyle[];
  
  /**
   * Text content
   */
  children: React.ReactNode;
}

/**
 * Get styles for text variants
 */
const getVariantStyles = (variant: TextProps['variant']): TextStyle => {
  const variants: Record<string, TextStyle> = {
    body: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    },
    caption: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
      color: colors.gray,
    },
    label: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.fontSize.sm * typography.lineHeight.tight,
      letterSpacing: typography.letterSpacing.wide,
      textTransform: 'uppercase',
    },
  };

  return variants[variant || 'body'];
};

/**
 * Get font weight value
 */
const getFontWeight = (weight: TextProps['weight']): TextStyle['fontWeight'] => {
  if (!weight) return typography.fontWeight.regular;
  return typography.fontWeight[weight];
};

/**
 * Get font size value
 */
const getFontSize = (size: TextProps['size']): number => {
  if (typeof size === 'number') return size;
  if (!size) return typography.fontSize.base;
  return typography.fontSize[size];
};

/**
 * Get line height multiplier
 */
const getLineHeight = (lineHeight: TextProps['lineHeight'], fontSize: number): number => {
  if (!lineHeight) return fontSize * typography.lineHeight.normal;
  return fontSize * typography.lineHeight[lineHeight];
};

export const Text: React.FC<TextProps> = ({
  variant,
  color,
  weight,
  size,
  align,
  lineHeight,
  italic,
  underline,
  strikethrough,
  style,
  children,
  ...props
}) => {
  // Base styles from variant
  const variantStyles = getVariantStyles(variant);
  
  // Calculate font size
  const fontSize = size ? getFontSize(size) : variantStyles.fontSize || typography.fontSize.base;
  
  // Calculate line height based on font size
  const calculatedLineHeight = lineHeight 
    ? getLineHeight(lineHeight, fontSize)
    : variantStyles.lineHeight || fontSize * typography.lineHeight.normal;

  // Build style object
  const textStyle: TextStyle = {
    ...variantStyles,
    fontSize,
    lineHeight: calculatedLineHeight,
    ...(color && { color }),
    ...(weight && { fontWeight: getFontWeight(weight) }),
    ...(align && { textAlign: align }),
    ...(italic && { fontStyle: 'italic' }),
    ...(underline && { textDecorationLine: 'underline' }),
    ...(strikethrough && { textDecorationLine: 'line-through' }),
    ...(underline && strikethrough && { textDecorationLine: 'underline line-through' }),
  };

  return (
    <RNText
      style={[styles.base, textStyle, style]}
      {...props}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    color: colors.dark,
  },
});

// Export default for convenience
export default Text;
