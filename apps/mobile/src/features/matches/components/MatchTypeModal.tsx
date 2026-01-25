/**
 * Match Type Modal
 *
 * Bottom sheet modal to select Single or Double match type.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { useThemeStyles, useTranslation, type TranslationKey } from '../../../hooks';

export type MatchType = 'single' | 'double';

interface MatchTypeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: MatchType) => void;
}

export function MatchTypeModal({
  visible,
  onClose,
  onSelect,
}: MatchTypeModalProps) {
  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();

  const options: { type: MatchType; labelKey: string; icon: string }[] = [
    { type: 'single', labelKey: 'match.format.singles', icon: 'person' },
    { type: 'double', labelKey: 'match.format.doubles', icon: 'people' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
          {/* Handle bar */}
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />

          {/* Title */}
          <Text weight="semibold" size="lg" style={[styles.title, { color: colors.text }]}>
            {t('match.pickMatchType' as TranslationKey)}
          </Text>

          {/* Options */}
          <View style={styles.options}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  onSelect(option.type);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2C2C2E' : '#F0F0F0' }]}>
                  <Ionicons
                    name={option.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={colors.textSecondary}
                  />
                </View>
                <Text weight="medium" size="base" style={{ color: colors.text, marginLeft: 16 }}>
                  {t(option.labelKey as TranslationKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cancel button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text weight="medium" size="base" style={{ color: colors.textSecondary }}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  options: {
    paddingHorizontal: 24,
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 12,
  },
});
