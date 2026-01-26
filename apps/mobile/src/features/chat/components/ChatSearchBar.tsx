/**
 * ChatSearchBar Component
 * Inline search bar for finding and navigating messages within a conversation
 * Messages stay visible with matches highlighted, and up/down arrows to navigate
 */

import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@rallia/shared-components';
import { useThemeStyles, useTranslation } from '../../../hooks';
import { spacingPixels, fontSizePixels, primary, neutral } from '@rallia/design-system';
import { useSearchMessages } from '@rallia/shared-hooks';

interface ChatSearchBarProps {
  conversationId: string;
  visible: boolean;
  onClose: () => void;
  onSearchChange: (query: string, matchedMessageIds: string[]) => void;
  onNavigateToMatch: (messageId: string) => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function ChatSearchBarComponent({
  conversationId,
  visible,
  onClose,
  onSearchChange,
  onNavigateToMatch,
}: ChatSearchBarProps) {
  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const debouncedQuery = useDebounce(query, 300);

  const { data: results, isLoading } = useSearchMessages(conversationId, debouncedQuery, visible);

  // Get array of matched message IDs - wrapped in useMemo for stable reference
  const matchedMessageIds = useMemo(() => results?.map(r => r.id) || [], [results]);
  const totalMatches = matchedMessageIds.length;

  // Notify parent of search changes
  // This effect syncs derived state from search results - React 18+ batches these updates
  useEffect(() => {
    onSearchChange(debouncedQuery, matchedMessageIds);
    // Reset to first match when results change
    if (matchedMessageIds.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional sync when search results change
      setCurrentMatchIndex(0);
      onNavigateToMatch(matchedMessageIds[0]);
    }
  }, [debouncedQuery, matchedMessageIds, onSearchChange, onNavigateToMatch]);

  // Navigate to previous match (up arrow - older messages)
  const handlePrevMatch = useCallback(() => {
    if (totalMatches === 0) return;
    const newIndex = currentMatchIndex < totalMatches - 1 ? currentMatchIndex + 1 : 0;
    setCurrentMatchIndex(newIndex);
    onNavigateToMatch(matchedMessageIds[newIndex]);
  }, [currentMatchIndex, totalMatches, matchedMessageIds, onNavigateToMatch]);

  // Navigate to next match (down arrow - newer messages)
  const handleNextMatch = useCallback(() => {
    if (totalMatches === 0) return;
    const newIndex = currentMatchIndex > 0 ? currentMatchIndex - 1 : totalMatches - 1;
    setCurrentMatchIndex(newIndex);
    onNavigateToMatch(matchedMessageIds[newIndex]);
  }, [currentMatchIndex, totalMatches, matchedMessageIds, onNavigateToMatch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setCurrentMatchIndex(0);
  }, []);

  const handleClose = useCallback(() => {
    setQuery('');
    setCurrentMatchIndex(0);
    onSearchChange('', []);
    onClose();
  }, [onClose, onSearchChange]);

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
      {/* Search Input */}
      <View style={styles.inputContainer}>
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: isDark ? colors.background : neutral[100] },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={t('chat.searchInChat.placeholder')}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Match counter and navigation arrows */}
        {query.length >= 2 && !isLoading && (
          <View style={styles.navigationContainer}>
            {totalMatches > 0 ? (
              <>
                <Text style={[styles.matchCounter, { color: colors.textMuted }]}>
                  {currentMatchIndex + 1}/{totalMatches}
                </Text>
                <TouchableOpacity
                  onPress={handlePrevMatch}
                  style={styles.navButton}
                  disabled={totalMatches === 0}
                >
                  <Ionicons
                    name="chevron-up"
                    size={22}
                    color={totalMatches > 0 ? colors.text : colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleNextMatch}
                  style={styles.navButton}
                  disabled={totalMatches === 0}
                >
                  <Ionicons
                    name="chevron-down"
                    size={22}
                    color={totalMatches > 0 ? colors.text : colors.textMuted}
                  />
                </TouchableOpacity>
              </>
            ) : (
              <Text style={[styles.noMatchText, { color: colors.textMuted }]}>
                {t('chat.searchInChat.noMatches')}
              </Text>
            )}
          </View>
        )}

        {/* Loading indicator */}
        {isLoading && query.length >= 2 && (
          <ActivityIndicator size="small" color={primary[500]} style={styles.loader} />
        )}

        {/* Close button */}
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const ChatSearchBar = memo(ChatSearchBarComponent);

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[2],
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: spacingPixels[3],
    height: 40,
  },
  searchIcon: {
    marginRight: spacingPixels[2],
  },
  input: {
    flex: 1,
    fontSize: fontSizePixels.base,
    height: 40,
  },
  clearButton: {
    padding: spacingPixels[1],
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacingPixels[2],
  },
  matchCounter: {
    fontSize: fontSizePixels.sm,
    minWidth: 45,
    textAlign: 'center',
  },
  noMatchText: {
    fontSize: fontSizePixels.sm,
  },
  navButton: {
    padding: spacingPixels[1],
  },
  loader: {
    marginLeft: spacingPixels[2],
  },
  closeButton: {
    padding: spacingPixels[2],
    marginLeft: spacingPixels[1],
  },
});
