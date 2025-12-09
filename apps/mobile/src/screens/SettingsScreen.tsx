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
import { useNavigation } from '@react-navigation/native';
import { useLocale } from '../context';
import { useTranslation } from '../hooks';
import type { Locale } from '@rallia/shared-translations';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
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
  const [selectedAppearance, setSelectedAppearance] = useState<'Light' | 'Dark' | 'System'>(
    'Light'
  );
  const [isChangingLocale, setIsChangingLocale] = useState(false);

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
      (navigation as any).navigate('HomeScreen');
    } catch (error) {
      Logger.error('Failed to sign out', error as Error);
    }
  };

  const handleDeleteAccount = () => {
    // TODO: Implement delete account functionality
    Logger.logUserAction('delete_account_pressed');
  };

  const handleEditProfile = () => {
    (navigation as any).navigate('UserProfile');
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
    <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
      <View style={styles.settingsItemLeft}>
        <Ionicons name={icon} size={20} color="#333" />
        <Text style={styles.settingsItemText}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  // Show loading indicator until i18n is ready
  if (!isReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16A58D" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Profile Section */}
        <View style={styles.profileSection}>
          {profilePictureUrl ? (
            <Image source={{ uri: profilePictureUrl }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={32} color="#999" />
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
          </View>
        </View>

        {/* Edit Profile */}
        <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
          <Ionicons name="create-outline" size={18} color="#333" />
          <Text style={styles.editProfileText}>{t('profile.editProfile')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* Settings Items */}
        <View style={styles.settingsGroup}>
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
        <View style={styles.preferenceSection}>
          <View style={styles.preferenceTitleRow}>
            <Text style={styles.preferenceSectionTitle}>{t('settings.language')}</Text>
            {isManuallySet && (
              <TouchableOpacity onPress={handleResetToSystemLocale} disabled={isChangingLocale}>
                <Text style={styles.resetButton}>{t('settings.languageAuto')}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.preferenceDescription}>{t('settings.languageDescription')}</Text>
          <View style={styles.preferenceOptions}>
            {availableLocales.map(loc => {
              const config = localeConfigs[loc];
              return (
                <TouchableOpacity
                  key={loc}
                  style={[styles.preferenceButton, locale === loc && styles.preferenceButtonActive]}
                  onPress={() => handleLanguageChange(loc)}
                  disabled={isChangingLocale}
                >
                  {isChangingLocale && locale !== loc ? (
                    <ActivityIndicator size="small" color={locale === loc ? '#fff' : '#666'} />
                  ) : (
                    <Text
                      style={[
                        styles.preferenceButtonText,
                        locale === loc && styles.preferenceButtonTextActive,
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
            <Text style={styles.autoDetectedText}>{t('settings.languageAuto')}</Text>
          )}
        </View>

        {/* Appearance */}
        <View style={styles.preferenceSection}>
          <Text style={styles.preferenceSectionTitle}>{t('settings.theme')}</Text>
          <View style={styles.preferenceOptions}>
            <TouchableOpacity
              style={[
                styles.preferenceButton,
                selectedAppearance === 'Light' && styles.preferenceButtonActive,
              ]}
              onPress={() => setSelectedAppearance('Light')}
            >
              <Text
                style={[
                  styles.preferenceButtonText,
                  selectedAppearance === 'Light' && styles.preferenceButtonTextActive,
                ]}
              >
                {t('settings.lightMode')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.preferenceButton,
                selectedAppearance === 'Dark' && styles.preferenceButtonActive,
              ]}
              onPress={() => setSelectedAppearance('Dark')}
            >
              <Text
                style={[
                  styles.preferenceButtonText,
                  selectedAppearance === 'Dark' && styles.preferenceButtonTextActive,
                ]}
              >
                {t('settings.darkMode')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.preferenceButton,
                selectedAppearance === 'System' && styles.preferenceButtonActive,
              ]}
              onPress={() => setSelectedAppearance('System')}
            >
              <Text
                style={[
                  styles.preferenceButtonText,
                  selectedAppearance === 'System' && styles.preferenceButtonTextActive,
                ]}
              >
                {t('settings.systemTheme')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out & Delete Account */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color="#333" />
            <Text style={styles.signOutText}>{t('settings.logout')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            <Text style={styles.deleteAccountText}>{t('settings.deleteAccount')}</Text>
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
    backgroundColor: '#C8F2EF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#C8F2EF',
  },
  backButton: {
    padding: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#fff',
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
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  editProfileText: {
    fontSize: 16,
    color: '#333',
  },
  settingsGroup: {
    backgroundColor: '#fff',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsItemText: {
    fontSize: 16,
    color: '#333',
  },
  preferenceSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  preferenceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preferenceSectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 12,
    color: '#999',
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
    backgroundColor: '#F0F0F0',
    minWidth: 80,
    alignItems: 'center',
  },
  preferenceButtonActive: {
    backgroundColor: '#16A58D',
  },
  preferenceButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  preferenceButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  autoDetectedText: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionButtons: {
    paddingHorizontal: 20,
    paddingTop: 24,
    backgroundColor: '#fff',
    gap: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    gap: 8,
  },
  deleteAccountText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
});

export default SettingsScreen;
