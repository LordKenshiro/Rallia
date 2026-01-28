/**
 * ChatAgreementModal Component
 * Shows chat community guidelines when user enters a conversation for the first time
 * Adapts content based on chat type (direct vs group)
 */

import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text, Button } from '@rallia/shared-components';
import { useThemeStyles } from '../../../hooks';
import { spacingPixels, fontSizePixels, radiusPixels, primary } from '@rallia/design-system';
import { useTranslation } from 'react-i18next';

interface ChatAgreementModalProps {
  visible: boolean;
  onAgree: () => void;
  chatName?: string;
  chatImageUrl?: string | null;
  isDirectChat?: boolean;
}

export const ChatAgreementModal: React.FC<ChatAgreementModalProps> = ({
  visible,
  onAgree,
  chatName = 'this chat',
  chatImageUrl,
  isDirectChat = false,
}) => {
  const { colors } = useThemeStyles();
  const { t } = useTranslation();

  const rules = [
    t('chat.rules.noHarassment', 'No harassment, hate speech, sexual language'),
    t('chat.rules.noAdvertising', 'No advertising or self promotion'),
    t('chat.rules.noDisrespect', 'No disrespect!'),
  ];

  // Different description based on chat type
  const description = isDirectChat
    ? t('chat.agreement.descriptionDirect', 'This is a private conversation. Please be respectful and follow our community guidelines.')
    : t('chat.agreement.description', 'This is a group chat - all members of this community will see your messages');

  // Different icon based on chat type
  const iconName = isDirectChat ? 'chatbubble' : 'people';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <ScrollView 
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Chat Image */}
            <View style={styles.imageContainer}>
              {chatImageUrl ? (
                <Image
                  source={{ uri: chatImageUrl }}
                  style={styles.chatImage}
                />
              ) : (
                <View style={[styles.placeholderImage, { backgroundColor: primary[100] }]}>
                  <Ionicons name={iconName} size={40} color={primary[500]} />
                </View>
              )}
            </View>

            {/* Welcome Text */}
            <Text style={[styles.welcomeText, { color: colors.textMuted }]}>
              {isDirectChat 
                ? t('chat.agreement.welcomeDirect', 'Starting conversation with')
                : t('chat.agreement.welcome', 'Welcome to')}
            </Text>
            <Text style={[styles.chatName, { color: colors.text }]}>
              {chatName}
            </Text>

            {/* Description */}
            <Text style={[styles.description, { color: colors.textMuted }]}>
              {description}
            </Text>

            {/* Rules Section */}
            <View style={styles.rulesSection}>
              <Text style={[styles.rulesTitle, { color: colors.text }]}>
                {t('chat.agreement.chatRules', 'Chat rules')}
              </Text>

              {rules.map((rule, index) => (
                <View key={index} style={styles.ruleRow}>
                  <Ionicons 
                    name="close" 
                    size={18} 
                    color="#EF4444" 
                    style={styles.ruleIcon}
                  />
                  <Text style={[styles.ruleText, { color: colors.text }]}>
                    {rule}
                  </Text>
                </View>
              ))}

              {/* Warning Text */}
              <Text style={[styles.warningText, { color: colors.textMuted }]}>
                {t('chat.agreement.warning', 'Content will be removed and users banned for violations of our community guidelines')}
              </Text>
            </View>

            {/* Agree Button */}
            <Button
              onPress={onAgree}
              variant="primary"
              fullWidth
            >
              {t('chat.agreement.agree', 'I agree')}
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacingPixels[4],
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radiusPixels.xl,
    maxHeight: '80%',
  },
  content: {
    padding: spacingPixels[6],
    alignItems: 'center',
  },
  imageContainer: {
    marginBottom: spacingPixels[4],
  },
  chatImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: fontSizePixels.base,
    marginBottom: spacingPixels[1],
  },
  chatName: {
    fontSize: fontSizePixels.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacingPixels[3],
  },
  description: {
    fontSize: fontSizePixels.sm,
    textAlign: 'center',
    marginBottom: spacingPixels[5],
    lineHeight: 20,
  },
  rulesSection: {
    width: '100%',
    marginBottom: spacingPixels[5],
  },
  rulesTitle: {
    fontSize: fontSizePixels.base,
    fontWeight: '600',
    marginBottom: spacingPixels[3],
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacingPixels[2],
  },
  ruleIcon: {
    marginRight: spacingPixels[2],
    marginTop: 2,
  },
  ruleText: {
    fontSize: fontSizePixels.sm,
    flex: 1,
    lineHeight: 20,
  },
  warningText: {
    fontSize: fontSizePixels.xs,
    marginTop: spacingPixels[3],
    lineHeight: 18,
  },
});

export default ChatAgreementModal;
