/**
 * SearchBar Component
 * A themed search input with clear button and loading indicator.
 */

import React, { useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStyles } from '../../../hooks';
import {
  spacingPixels,
  radiusPixels,
  fontSizePixels,
  neutral,
} from '@rallia/design-system';

interface SearchBarProps {
  /** Current search value */
  value: string;
  /** Called when text changes */
  onChangeText: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show loading indicator */
  isLoading?: boolean;
  /** Called when the clear button is pressed */
  onClear?: () => void;
  /** Auto focus on mount */
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  isLoading = false,
  onClear,
  autoFocus = false,
}: SearchBarProps) {
  const { colors } = useThemeStyles();
  const inputRef = useRef<TextInput>(null);
  const isDark = colors.background === '#000000' || colors.background === '#0a0a0a';

  const handleClear = () => {
    onChangeText('');
    onClear?.();
    inputRef.current?.focus();
  };

  const showClearButton = value.length > 0 && !isLoading;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? neutral[800] : neutral[100],
          borderColor: isDark ? neutral[700] : neutral[200],
        },
      ]}
    >
      <Ionicons
        name="search-outline"
        size={20}
        color={colors.textMuted}
        style={styles.searchIcon}
      />
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          {
            color: colors.text,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
        clearButtonMode="never" // We handle clear button ourselves
      />
      {isLoading && (
        <ActivityIndicator size="small" color={colors.primary} style={styles.loadingIndicator} />
      )}
      {showClearButton && (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    paddingHorizontal: spacingPixels[3],
    height: 44,
  },
  searchIcon: {
    marginRight: spacingPixels[2],
  },
  input: {
    flex: 1,
    fontSize: fontSizePixels.base,
    paddingVertical: 0, // Remove default padding
  },
  loadingIndicator: {
    marginLeft: spacingPixels[2],
  },
  clearButton: {
    marginLeft: spacingPixels[2],
    padding: spacingPixels[1],
  },
});

export default SearchBar;
