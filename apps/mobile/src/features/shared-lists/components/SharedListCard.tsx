/**
 * SharedListCard Component
 * Displays a shared contact list with actions
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { primary, neutral, status } from '@rallia/design-system';
import type { SharedContactList } from '@rallia/shared-services';
import { useTranslation, type TranslationKey } from '../../../hooks';

interface ThemeColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
}

interface SharedListCardProps {
  list: SharedContactList;
  colors: ThemeColors;
  isDark: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const SharedListCard: React.FC<SharedListCardProps> = ({
  list,
  colors,
  isDark,
  onPress,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: isDark ? primary[900] : primary[50] }]}>
        <Ionicons name="people" size={24} color={primary[500]} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text size="base" weight="semibold" color={colors.text} numberOfLines={1}>
          {list.name}
        </Text>
        {list.description ? (
          <Text size="sm" color={colors.textSecondary} numberOfLines={1} style={styles.description}>
            {list.description}
          </Text>
        ) : null}
        <Text size="xs" color={colors.textMuted} style={styles.contactCount}>
          {list.contact_count === 1 
            ? t('sharedLists.contacts.contactCountSingular' as TranslationKey, { count: list.contact_count })
            : t('sharedLists.contacts.contactCount' as TranslationKey, { count: list.contact_count })
          }
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? neutral[700] : neutral[100] }]}
          onPress={onEdit}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="pencil" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? neutral[700] : neutral[100] }]}
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={16} color={status.error.DEFAULT} />
        </TouchableOpacity>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={styles.chevron} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[3],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    marginBottom: spacingPixels[3],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radiusPixels.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingPixels[3],
  },
  content: {
    flex: 1,
    marginRight: spacingPixels[2],
  },
  description: {
    marginTop: spacingPixels[0.5],
  },
  contactCount: {
    marginTop: spacingPixels[1],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2],
    marginRight: spacingPixels[2],
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: radiusPixels.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    marginLeft: spacingPixels[1],
  },
});

export default SharedListCard;
