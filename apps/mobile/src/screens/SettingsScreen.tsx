import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, Logger } from '@rallia/shared-services';
import { useTheme } from '../hooks';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLocale } from '../context';
import { useTranslation } from '../hooks';
import type { Locale } from '@rallia/shared-translations';

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
    isReady,
    resetToDeviceLocale,
    localeConfigs,
    availableLocales,
  } = useLocale();
  const { t } = useTranslation();

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [isChangingLocale, setIsChangingLocale] = useState(false);
  const { theme, themePreference, setThemePreference } = useTheme();

  // Theme-aware colors
  const isDark = theme === 'dark';
  const colors = {
    background: isDark ? '#042f2e' : '#C8F2EF',
    cardBackground: isDark ? '#134e4a' : '#ffffff',
    text: isDark ? '#f0fdfa' : '#333333',
    textSecondary: isDark ? '#5eead4' : '#666666',
    textMuted: isDark ? '#2dd4bf' : '#999999',
    border: isDark ? '#115e59' : '#F0F0F0',
    icon: isDark ? '#f0fdfa' : '#333333',
    iconMuted: isDark ? '#5eead4' : '#999999',
    buttonInactive: isDark ? '#115e59' : '#F0F0F0',
    buttonActive: '#16A58D',
    buttonTextInactive: isDark ? '#5eead4' : '#666666',
    buttonTextActive: '#ffffff',
    deleteButtonBg: isDark ? '#2f1516' : '#FFF5F5',
    deleteButtonText: '#FF3B30',
  };

  // Check authentication on mount and redirect if not logged in
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t('errors.unauthorized'), t('auth.signIn'));
        navigation.goBack();
        return;
      }
      fetchUserData();
    };
    checkAuth();
  }, [navigation, t]);

  const fetchUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profile')
        .select('full_name, display_name, email, profile_picture_url')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserName(profile.display_name || profile.full_name || '');
        setUserEmail(profile.email || user.email || '');
        setProfilePictureUrl(profile.profile_picture_url);
      }
    } catch (error) {
      Logger.error('Failed to fetch user data', error as Error);
    }
  };

  const handleLanguageChange = async (newLocale: Locale) => {
    if (newLocale === locale || isChangingLocale) return;

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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      // Navigate to Home after successful sign out
      navigation.navigate('HomeScreen');
    } catch (error) {
      Logger.error('Failed to sign out', error as Error);
    }
  };

  const handleDeleteAccount = () => {
    // TODO: Implement delete account functionality
    Logger.logUserAction('delete_account_pressed');
  };

  const handleEditProfile = () => {
    navigation.navigate('UserProfile');
  };

  const SettingsItem = ({
    icon,
    title,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.settingsItem,
        { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
      ]}
      onPress={onPress}
    >
      <View style={styles.settingsItemLeft}>
        <Ionicons name={icon} size={20} color={colors.icon} />
        <Text style={[styles.settingsItemText, { color: colors.text }]}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.iconMuted} />
    </TouchableOpacity>
  );

  // Show loading indicator until i18n is ready
  if (!isReady) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingContainer, { backgroundColor: colors.cardBackground }]}>
          <ActivityIndicator size="large" color={colors.buttonActive} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={[styles.scrollContent, { backgroundColor: colors.cardBackground }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: colors.cardBackground }]}>
          {profilePictureUrl ? (
            <Image source={{ uri: profilePictureUrl }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={32} color={colors.iconMuted} />
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{userName}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{userEmail}</Text>
          </View>
        </View>

        {/* Edit Profile */}
        <TouchableOpacity
          style={[
            styles.editProfileButton,
            { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
          ]}
          onPress={handleEditProfile}
        >
          <Ionicons name="create-outline" size={18} color={colors.icon} />
          <Text style={[styles.editProfileText, { color: colors.text }]}>
            {t('profile.editProfile')}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.iconMuted}
            style={{ marginLeft: 'auto' }}
          />
        </TouchableOpacity>

        {/* Settings Items */}
        <View style={[styles.settingsGroup, { backgroundColor: colors.cardBackground }]}>
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
        </View>

        {/* Preferred Language */}
        <View style={[styles.preferenceSection, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.preferenceTitleRow}>
            <Text style={[styles.preferenceSectionTitle, { color: colors.textSecondary }]}>
              {t('settings.language')}
            </Text>
            {isManuallySet && (
              <TouchableOpacity onPress={handleResetToSystemLocale} disabled={isChangingLocale}>
                <Text style={styles.resetButton}>{t('settings.languageAuto')}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.preferenceDescription, { color: colors.textMuted }]}>
            {t('settings.languageDescription')}
          </Text>
          <View style={styles.preferenceOptions}>
            {availableLocales.map(loc => {
              const config = localeConfigs[loc];
              return (
                <TouchableOpacity
                  key={loc}
                  style={[
                    styles.preferenceButton,
                    {
                      backgroundColor: locale === loc ? colors.buttonActive : colors.buttonInactive,
                    },
                  ]}
                  onPress={() => handleLanguageChange(loc)}
                  disabled={isChangingLocale}
                >
                  {isChangingLocale && locale !== loc ? (
                    <ActivityIndicator
                      size="small"
                      color={locale === loc ? colors.buttonTextActive : colors.buttonTextInactive}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.preferenceButtonText,
                        {
                          color:
                            locale === loc ? colors.buttonTextActive : colors.buttonTextInactive,
                        },
                      ]}
                    >
                      {config.nativeName}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {!isManuallySet && (
            <Text style={[styles.autoDetectedText, { color: colors.textMuted }]}>
              {t('settings.languageAuto')}
            </Text>
          )}
        </View>

        {/* Appearance */}
        <View style={[styles.preferenceSection, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.preferenceSectionTitle, { color: colors.textSecondary }]}>
            {t('settings.theme')}
          </Text>
          <View style={styles.preferenceOptions}>
            <TouchableOpacity
              style={[
                styles.preferenceButton,
                {
                  backgroundColor:
                    themePreference === 'light' ? colors.buttonActive : colors.buttonInactive,
                },
              ]}
              onPress={() => setThemePreference('light')}
            >
              <Text
                style={[
                  styles.preferenceButtonText,
                  {
                    color:
                      themePreference === 'light'
                        ? colors.buttonTextActive
                        : colors.buttonTextInactive,
                  },
                ]}
              >
                {t('settings.lightMode')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.preferenceButton,
                {
                  backgroundColor:
                    themePreference === 'dark' ? colors.buttonActive : colors.buttonInactive,
                },
              ]}
              onPress={() => setThemePreference('dark')}
            >
              <Text
                style={[
                  styles.preferenceButtonText,
                  {
                    color:
                      themePreference === 'dark'
                        ? colors.buttonTextActive
                        : colors.buttonTextInactive,
                  },
                ]}
              >
                {t('settings.darkMode')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.preferenceButton,
                {
                  backgroundColor:
                    themePreference === 'system' ? colors.buttonActive : colors.buttonInactive,
                },
              ]}
              onPress={() => setThemePreference('system')}
            >
              <Text
                style={[
                  styles.preferenceButtonText,
                  {
                    color:
                      themePreference === 'system'
                        ? colors.buttonTextActive
                        : colors.buttonTextInactive,
                  },
                ]}
              >
                {t('settings.systemTheme')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out & Delete Account */}
        <View style={[styles.actionButtons, { backgroundColor: colors.cardBackground }]}>
          <TouchableOpacity
            style={[styles.signOutButton, { backgroundColor: colors.buttonInactive }]}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.icon} />
            <Text style={[styles.signOutText, { color: colors.text }]}>{t('settings.logout')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteAccountButton, { backgroundColor: colors.deleteButtonBg }]}
            onPress={handleDeleteAccount}
          >
            <Ionicons name="trash-outline" size={18} color={colors.deleteButtonText} />
            <Text style={[styles.deleteAccountText, { color: colors.deleteButtonText }]}>
              {t('settings.deleteAccount')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  backButton: {
    padding: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0E0E0',
  },
  profileImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  editProfileText: {
    fontSize: 16,
  },
  settingsGroup: {
    // backgroundColor set dynamically
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsItemText: {
    fontSize: 16,
  },
  preferenceSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  preferenceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preferenceSectionTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 12,
    marginBottom: 12,
  },
  resetButton: {
    fontSize: 12,
    color: '#16A58D',
    fontWeight: '500',
  },
  preferenceOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  preferenceButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  preferenceButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  autoDetectedText: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionButtons: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  deleteAccountText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SettingsScreen;
