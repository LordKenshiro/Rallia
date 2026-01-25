/**
 * GroupOptionsModal
 * A styled bottom sheet modal for group action options
 */

import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { useThemeStyles, useTranslation } from '../../../hooks';

interface OptionItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
}

interface GroupOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  options: OptionItem[];
  title?: string;
}

export function GroupOptionsModal({
  visible,
  onClose,
  options,
  title = 'Group Options',
}: GroupOptionsModalProps) {
  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text weight="semibold" size="lg" style={{ color: colors.text }}>
                  {title === 'Group Options' ? t('groups.groupOptions' as any) : title}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Options List */}
              <View style={styles.optionsList}>
                {options.map((option, index) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionItem,
                      index < options.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                    ]}
                    onPress={() => {
                      onClose();
                      option.onPress();
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.optionIcon,
                        {
                          backgroundColor: option.destructive
                            ? isDark ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.1)'
                            : isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)',
                        },
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={22}
                        color={option.destructive ? '#FF3B30' : colors.primary}
                      />
                    </View>
                    <Text
                      weight="medium"
                      size="base"
                      style={{
                        color: option.destructive ? '#FF3B30' : colors.text,
                        flex: 1,
                      }}
                    >
                      {option.label}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={option.destructive ? '#FF3B30' : colors.textMuted}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text weight="semibold" size="base" style={{ color: colors.primary }}>
                  {t('common.cancel' as any)}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    padding: 4,
  },
  optionsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cancelButton: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
});
