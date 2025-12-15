import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@rallia/shared-components';
import { useThemeStyles, useTranslation } from '../hooks';
import { spacingPixels, fontSizePixels } from '@rallia/design-system';
import RalliaLogo from '../../assets/images/logo-dark.svg';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const Chat = () => {
  const { colors } = useThemeStyles();
  const { t } = useTranslation();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.placeholderContainer}>
          <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
            {t('chat.empty')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  placeholderContainer: {
    minHeight: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacingPixels[10],
  },
  placeholderText: {
    fontSize: fontSizePixels.base,
    textAlign: 'center',
  },
});

export default Chat;
