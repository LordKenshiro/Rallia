import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { Logger } from '@rallia/shared-services';
import { useTheme } from '../hooks/useTheme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLocale } from '../context';
import { useAuth, useTranslation } from '../hooks';
import type { Locale } from '@rallia/shared-translations';
import { useProfile } from '@rallia/shared-hooks';
import {
  lightTheme,
  darkTheme,
  spacingPixels,
  radiusPixels,
  primary,
  neutral,
  base,
  status,
} from '@rallia/design-system';
import { lightHaptic, warningHaptic } from '@rallia/shared-utils';

type SettingsScreenNavigationProp = NativeStackNavigationProp<{
  HomeScreen: undefined;
  UserProfile: undefined;
  Settings: undefined;
}>;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const {
    locale,
    setLocale,
    isManuallySet,
    isReady: isLocaleReady,
    resetToDeviceLocale,
    localeConfigs,
    availableLocales,
  } = useLocale();
  const { t } = useTranslation();

  const { isAuthenticated, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  const [isChangingLocale, setIsChangingLocale] = useState(false);
  const { theme, themePreference, setThemePreference } = useTheme();
  const isDark = theme === 'dark';

  // Theme-aware colors from design system
  const themeColors = isDark ? darkTheme : lightTheme;
  const colors = useMemo(
    () => ({
      background: themeColors.background,
      cardBackground: themeColors.card,
      text: themeColors.foreground,
      textSecondary: isDark ? primary[300] : neutral[600],
      textMuted: themeColors.mutedForeground,
      border: themeColors.border,
      icon: themeColors.foreground,
      iconMuted: themeColors.mutedForeground,
      buttonInactive: themeColors.muted,
      buttonActive: isDark ? primary[500] : primary[600],
      buttonTextInactive: themeColors.mutedForeground,
      buttonTextActive: base.white,
      deleteButtonBg: isDark ? `${status.error.DEFAULT}20` : `${status.error.light}15`,
      deleteButtonText: status.error.DEFAULT,
    }),
    [themeColors, isDark]
  );

  const handleLanguageChange = async (newLocale: Locale) => {
    if (newLocale === locale || isChangingLocale) return;

    lightHaptic();
    setIsChangingLocale(true);
    try {
      await setLocale(newLocale);
      Logger.logUserAction('language_changed', { locale: newLocale });
    } catch (error) {
      Logger.error('Failed to change language', error as Error);
      Alert.alert(t('common.error'), t('errors.unknown'));
    } finally {
      setIsChangingLocale(false);
    }
  };

  const handleResetToSystemLocale = async () => {
    if (!isManuallySet || isChangingLocale) return;

    setIsChangingLocale(true);
    try {
      await resetToDeviceLocale();
      Logger.logUserAction('language_reset_to_system');
    } catch (error) {
      Logger.error('Failed to reset language', error as Error);
    } finally {
      setIsChangingLocale(false);
    }
  };

  const handleDeleteAccount = () => {
    warningHaptic();
    // TODO: Implement delete account functionality
    Logger.logUserAction('delete_account_pressed');
  };

  const handleEditProfile = () => {
    navigation.navigate('UserProfile');
  };

  // const SettingsItem = ({
  //   icon,
  //   title,
  //   onPress,
  // }: {
  //   icon: keyof typeof Ionicons.glyphMap;
  //   title: string;
  //   onPress: () => void;
  // }) => (
  //   <TouchableOpacity
  //     style={[
  //       styles.settingsItem,
  //       { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
  //     ]}
  //     onPress={() => {
  //       lightHaptic();
  //       onPress();
  //     }}
  //     activeOpacity={0.7}
  //   >
  //     <View style={styles.settingsItemLeft}>
  //       <Ionicons name={icon} size={20} color={colors.icon} />
  //       <Text size="base" color={colors.text}>
  //         {title}
  //       </Text>
  //     </View>
  //     <Ionicons name="chevron-forward" size={20} color={colors.iconMuted} />
  //   </TouchableOpacity>
  // );

  // Show loading indicator until i18n is ready
  if (!isLocaleReady || authLoading || profileLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.buttonActive} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView
        style={[styles.scrollContent, { backgroundColor: colors.cardBackground }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Edit Profile */}
        {isAuthenticated && (
          <View style={[styles.profileGroup, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.profileSection, { backgroundColor: colors.cardBackground }]}>
              {profile?.profile_picture_url ? (
                <Image source={{ uri: profile.profile_picture_url }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={32} color={colors.iconMuted} />
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text size="lg" weight="semibold" color={colors.text}>
                  {profile?.full_name || profile?.display_name || ''}
                </Text>
                <Text size="sm" color={colors.textSecondary} style={styles.profileEmail}>
                  {profile?.email || ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.editProfileButton,
                { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
              ]}
              onPress={() => {
                lightHaptic();
                handleEditProfile();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={18} color={colors.icon} />
              <Text size="base" color={colors.text}>
                {t('profile.editProfile')}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.iconMuted}
                style={{ marginLeft: 'auto' }}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Settings Items */}
        {/* <View style={[styles.settingsGroup, { backgroundColor: colors.cardBackground }]}>
          {isAuthenticated && (
            <>
              <SettingsItem
                icon="notifications-outline"
                title={t('settings.notifications')}
                onPress={() => {
                  Logger.logUserAction('settings_notifications_pressed');
                }}
              />
              <SettingsItem
                icon="lock-closed-outline"
                title={t('settings.privacy')}
                onPress={() => {
                  Logger.logUserAction('settings_permissions_pressed');
                }}
              />
              <SettingsItem
                icon="card-outline"
                title={t('settings.subscription')}
                onPress={() => {
                  Logger.logUserAction('settings_subscription_pressed');
                }}
              />
              <SettingsItem
                icon="wallet-outline"
                title={t('settings.payments')}
                onPress={() => {
                  Logger.logUserAction('settings_payments_pressed');
                }}
              />
            </>
          )}
          <SettingsItem
            icon="help-circle-outline"
            title={t('settings.about')}
            onPress={() => {
              Logger.logUserAction('settings_help_pressed');
            }}
          />
          <SettingsItem
            icon="document-text-outline"
            title={t('settings.termsOfService')}
            onPress={() => {
              Logger.logUserAction('settings_terms_pressed');
            }}
          />
        </View> */}

        {/* Preferred Language */}
        <View style={[styles.preferenceSection, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.preferenceTitleRow}>
            <Text size="sm" color={colors.textSecondary}>
              {t('settings.language')}
            </Text>
            {isManuallySet && (
              <TouchableOpacity
                onPress={() => {
                  lightHaptic();
                  handleResetToSystemLocale();
                }}
                disabled={isChangingLocale}
              >
                <Text size="xs" weight="medium" color={primary[500]}>
                  {t('settings.languageAuto')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Text size="xs" color={colors.textMuted} style={styles.preferenceDescription}>
            {t('settings.languageDescription')}
          </Text>
          <View style={styles.preferenceOptions}>
            {availableLocales.map(loc => {
              const config = localeConfigs[loc];
              const isActive = locale === loc;
              return (
                <TouchableOpacity
                  key={loc}
                  style={[
                    styles.preferenceButton,
                    {
                      backgroundColor: isActive ? colors.buttonActive : colors.buttonInactive,
                    },
                  ]}
                  onPress={() => handleLanguageChange(loc)}
                  disabled={isChangingLocale}
                  activeOpacity={0.7}
                >
                  {isChangingLocale && !isActive ? (
                    <ActivityIndicator
                      size="small"
                      color={isActive ? colors.buttonTextActive : colors.buttonTextInactive}
                    />
                  ) : (
                    <Text
                      size="sm"
                      weight="medium"
                      color={isActive ? colors.buttonTextActive : colors.buttonTextInactive}
                    >
                      {config.nativeName}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {!isManuallySet && (
            <Text size="xs" color={colors.textMuted} style={styles.autoDetectedText}>
              {t('settings.languageAuto')}
            </Text>
          )}
        </View>

        {/* Appearance */}
        <View style={[styles.preferenceSection, { backgroundColor: colors.cardBackground }]}>
          <Text size="sm" color={colors.textSecondary} style={styles.preferenceSectionTitle}>
            {t('settings.theme')}
          </Text>
          <View style={styles.preferenceOptions}>
            {(['light', 'dark', 'system'] as const).map(themePref => {
              const isActive = themePreference === themePref;
              const labelKey =
                themePref === 'light'
                  ? 'settings.lightMode'
                  : themePref === 'dark'
                    ? 'settings.darkMode'
                    : 'settings.systemTheme';
              return (
                <TouchableOpacity
                  key={themePref}
                  style={[
                    styles.preferenceButton,
                    {
                      backgroundColor: isActive ? colors.buttonActive : colors.buttonInactive,
                    },
                  ]}
                  onPress={() => {
                    lightHaptic();
                    setThemePreference(themePref);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    size="sm"
                    weight="medium"
                    color={isActive ? colors.buttonTextActive : colors.buttonTextInactive}
                  >
                    {t(labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Sign Out & Delete Account */}
        {isAuthenticated && (
          <View style={[styles.actionButtons, { backgroundColor: colors.cardBackground }]}>
            <TouchableOpacity
              style={[styles.signOutButton, { backgroundColor: colors.buttonInactive }]}
              onPress={() => {
                warningHaptic();
                signOut();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.icon} />
              <Text size="base" weight="medium" color={colors.text}>
                {t('settings.logout')}
              </Text>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={[styles.deleteAccountButton, { backgroundColor: colors.deleteButtonBg }]}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={colors.deleteButtonText} />
              <Text size="base" weight="medium" color={colors.deleteButtonText}>
                {t('settings.deleteAccount')}
              </Text>
            </TouchableOpacity> */}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
    paddingVertical: spacingPixels[5],
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[2],
  },
  profileImage: {
    width: spacingPixels[14],
    height: spacingPixels[14],
    borderRadius: radiusPixels.full,
  },
  profileImagePlaceholder: {
    width: spacingPixels[14],
    height: spacingPixels[14],
    borderRadius: radiusPixels.full,
    backgroundColor: neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    marginLeft: spacingPixels[4],
    flex: 1,
  },
  profileEmail: {
    marginTop: spacingPixels[1],
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[5],
    paddingVertical: spacingPixels[4],
    borderBottomWidth: 1,
    gap: spacingPixels[2],
  },
  settingsGroup: {
    paddingHorizontal: spacingPixels[5],
    paddingVertical: spacingPixels[5],
  },
  profileGroup: {
    paddingHorizontal: spacingPixels[5],
    paddingVertical: spacingPixels[5],
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingPixels[5],
    paddingVertical: spacingPixels[4],
    borderBottomWidth: 1,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[3],
  },
  preferenceSection: {
    paddingHorizontal: spacingPixels[5],
    paddingVertical: spacingPixels[5],
  },
  preferenceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingPixels[1],
  },
  preferenceSectionTitle: {
    marginBottom: spacingPixels[1],
  },
  preferenceDescription: {
    marginBottom: spacingPixels[3],
  },
  preferenceOptions: {
    flexDirection: 'row',
    gap: spacingPixels[3],
  },
  preferenceButton: {
    paddingHorizontal: spacingPixels[5],
    paddingVertical: spacingPixels[2.5],
    borderRadius: radiusPixels.full,
    minWidth: spacingPixels[20],
    alignItems: 'center',
  },
  autoDetectedText: {
    marginTop: spacingPixels[2],
    fontStyle: 'italic',
  },
  actionButtons: {
    paddingHorizontal: spacingPixels[5],
    paddingTop: spacingPixels[6],
    gap: spacingPixels[3],
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[3.5],
    borderRadius: radiusPixels.lg,
    gap: spacingPixels[2],
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[3.5],
    borderRadius: radiusPixels.lg,
    gap: spacingPixels[2],
  },
  bottomSpacer: {
    height: spacingPixels[10],
  },
});

export default SettingsScreen;
