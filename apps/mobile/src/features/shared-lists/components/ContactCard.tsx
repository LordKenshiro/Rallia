/**
 * ContactCard Component
 * Displays a contact with edit/delete actions
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { primary, neutral, status } from '@rallia/design-system';
import type { SharedContact } from '@rallia/shared-services';
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

interface ContactCardProps {
  contact: SharedContact;
  colors: ThemeColors;
  isDark: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const ContactCard: React.FC<ContactCardProps> = ({ contact, colors, isDark, onEdit, onDelete }) => {
  const { t } = useTranslation();
  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Format contact info
  const contactInfo = [];
  if (contact.phone) contactInfo.push(contact.phone);
  if (contact.email) contactInfo.push(contact.email);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.cardBackground, borderColor: colors.border },
      ]}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: isDark ? primary[900] : primary[100] }]}>
        <Text size="base" weight="semibold" color={primary[500]}>
          {getInitials(contact.name)}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text size="base" weight="semibold" color={colors.text} numberOfLines={1}>
          {contact.name}
        </Text>
        {contactInfo.length > 0 && (
          <Text size="sm" color={colors.textSecondary} numberOfLines={1} style={styles.contactInfo}>
            {contactInfo.join(' • ')}
          </Text>
        )}
        {contact.notes && (
          <Text size="xs" color={colors.textMuted} numberOfLines={1} style={styles.notes}>
            {contact.notes}
          </Text>
        )}
        {/* Source badge */}
        <View style={styles.sourceContainer}>
          <View
            style={[styles.sourceBadge, { backgroundColor: isDark ? neutral[700] : neutral[100] }]}
          >
            <Ionicons
              name={contact.source === 'phone_book' ? 'phone-portrait-outline' : 'create-outline'}
              size={12}
              color={colors.textMuted}
            />
            <Text size="xs" color={colors.textMuted}>
              {contact.source === 'phone_book'
                ? t('sharedLists.contact.fromContacts')
                : t('sharedLists.contact.manual')}
            </Text>
          </View>
        </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[3],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    marginBottom: spacingPixels[2],
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingPixels[3],
  },
  content: {
    flex: 1,
    marginRight: spacingPixels[2],
  },
  contactInfo: {
    marginTop: spacingPixels[0.5],
  },
  notes: {
    marginTop: spacingPixels[0.5],
    fontStyle: 'italic',
  },
  sourceContainer: {
    marginTop: spacingPixels[1],
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacingPixels[2],
    paddingVertical: spacingPixels[0.5],
    borderRadius: radiusPixels.sm,
    gap: spacingPixels[1],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2],
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: radiusPixels.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ContactCard;
