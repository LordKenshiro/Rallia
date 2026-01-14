/**
 * MemberOptionsModal
 * A styled bottom sheet modal for member action options
 */

import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { useThemeStyles } from '../../../hooks';

interface OptionItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
}

interface MemberInfo {
  name: string;
  role: 'member' | 'moderator';
  isCreator: boolean;
  profilePictureUrl?: string | null;
}

interface MemberOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  member: MemberInfo | null;
  options: OptionItem[];
}

export function MemberOptionsModal({ visible, onClose, member, options }: MemberOptionsModalProps) {
  const { colors, isDark } = useThemeStyles();

  if (!member) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
              {/* Member Header */}
              <View style={[styles.memberHeader, { borderBottomColor: colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                  {member.profilePictureUrl ? (
                    <Image source={{ uri: member.profilePictureUrl }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={32} color={colors.textMuted} />
                  )}
                </View>
                <View style={styles.memberInfo}>
                  <Text weight="semibold" size="lg" style={{ color: colors.text }}>
                    {member.name}
                  </Text>
                  <View style={styles.badges}>
                    {member.role === 'moderator' && (
                      <View
                        style={[styles.badge, { backgroundColor: isDark ? '#FF9500' : '#FFF3E0' }]}
                      >
                        <Text size="xs" style={{ color: isDark ? '#FFFFFF' : '#FF9500' }}>
                          Moderator
                        </Text>
                      </View>
                    )}
                    {member.isCreator && (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: isDark ? colors.primary : '#E8F5E9' },
                        ]}
                      >
                        <Text size="xs" style={{ color: isDark ? '#FFFFFF' : colors.primary }}>
                          Creator
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
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
                      index < options.length - 1 && {
                        borderBottomColor: colors.border,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
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
                            ? isDark
                              ? 'rgba(255, 59, 48, 0.15)'
                              : 'rgba(255, 59, 48, 0.1)'
                            : isDark
                              ? 'rgba(0, 122, 255, 0.15)'
                              : 'rgba(0, 122, 255, 0.1)',
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
                  Cancel
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
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  memberInfo: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
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
