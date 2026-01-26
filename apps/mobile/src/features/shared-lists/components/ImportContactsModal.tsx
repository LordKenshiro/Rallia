/**
 * ImportContactsModal Component
 * Modal for importing contacts from the device phone book
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { Text, useToast } from '@rallia/shared-components';
import { selectionHaptic, lightHaptic } from '@rallia/shared-utils';
import { useTranslation } from '../../../hooks';
import { spacingPixels, radiusPixels, fontSizePixels } from '@rallia/design-system';
import { primary, neutral } from '@rallia/design-system';
import { bulkCreateSharedContacts, type SharedContact } from '@rallia/shared-services';

interface ThemeColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  inputBackground: string;
}

interface DeviceContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  selected: boolean;
}

interface ImportContactsModalProps {
  visible: boolean;
  listId: string;
  existingContacts: SharedContact[];
  colors: ThemeColors;
  isDark: boolean;
  onClose: (refreshNeeded?: boolean) => void;
}

const ImportContactsModal: React.FC<ImportContactsModalProps> = ({
  visible,
  listId,
  existingContacts,
  colors,
  isDark,
  onClose,
}) => {
  const toast = useToast();
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<DeviceContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<Contacts.PermissionStatus | null>(null);

  // Get existing contact identifiers for duplicate detection - memoized
  const existingIdentifiers = React.useMemo(
    () =>
      new Set([
        ...existingContacts.map(c => c.device_contact_id).filter(Boolean),
        ...existingContacts.map(c => c.phone?.replace(/\D/g, '')).filter(Boolean),
        ...existingContacts.map(c => c.email?.toLowerCase()).filter(Boolean),
      ]),
    [existingContacts]
  );

  // Request permission and load contacts
  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        setIsLoading(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        sort: Contacts.SortTypes.FirstName,
      });

      // Transform and filter contacts
      const transformedContacts: DeviceContact[] = data
        .filter(contact => contact.name && (contact.phoneNumbers?.length || contact.emails?.length))
        .map(contact => {
          const phone = contact.phoneNumbers?.[0]?.number || null;
          const email = contact.emails?.[0]?.email || null;

          return {
            id: contact.id,
            name: contact.name || 'Unknown',
            phone,
            email,
            selected: false,
          };
        })
        // Filter out existing contacts
        .filter(contact => {
          const cleanPhone = contact.phone?.replace(/\D/g, '');
          return !(
            existingIdentifiers.has(contact.id) ||
            (cleanPhone && existingIdentifiers.has(cleanPhone)) ||
            (contact.email && existingIdentifiers.has(contact.email.toLowerCase()))
          );
        });

      setContacts(transformedContacts);
      setFilteredContacts(transformedContacts);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      Alert.alert(t('alerts.error'), t('sharedLists.import.failedToLoadContacts'));
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingIdentifiers]);

  // Load contacts when modal opens
  useEffect(() => {
    if (visible) {
      loadContacts();
      setSearchQuery('');
    }
  }, [visible, loadContacts]);

  // Filter contacts by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredContacts(
        contacts.filter(
          contact =>
            contact.name.toLowerCase().includes(query) ||
            contact.phone?.includes(query) ||
            contact.email?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, contacts]);

  // Toggle contact selection
  const toggleContact = useCallback((contactId: string) => {
    selectionHaptic();
    setContacts(prev => prev.map(c => (c.id === contactId ? { ...c, selected: !c.selected } : c)));
    setFilteredContacts(prev =>
      prev.map(c => (c.id === contactId ? { ...c, selected: !c.selected } : c))
    );
  }, []);

  // Select/deselect all
  const toggleSelectAll = useCallback(() => {
    lightHaptic();
    const allSelected = filteredContacts.every(c => c.selected);
    const filteredIds = new Set(filteredContacts.map(c => c.id));

    setContacts(prev =>
      prev.map(c => (filteredIds.has(c.id) ? { ...c, selected: !allSelected } : c))
    );
    setFilteredContacts(prev => prev.map(c => ({ ...c, selected: !allSelected })));
  }, [filteredContacts]);

  // Get selected count
  const selectedCount = contacts.filter(c => c.selected).length;

  // Import selected contacts
  const handleImport = async () => {
    const selectedContacts = contacts.filter(c => c.selected);
    if (selectedContacts.length === 0) {
      toast.warning(t('sharedLists.import.selectAtLeastOne'));
      return;
    }

    setIsImporting(true);
    try {
      await bulkCreateSharedContacts({
        list_id: listId,
        contacts: selectedContacts.map(c => ({
          name: c.name,
          phone: c.phone || undefined,
          email: c.email || undefined,
          source: 'phone_book',
          device_contact_id: c.id,
        })),
      });

      toast.success(
        t('sharedLists.import.importSuccess').replace('{count}', String(selectedContacts.length))
      );
      onClose(true);
    } catch (error) {
      console.error('Failed to import contacts:', error);
      toast.error(t('sharedLists.import.failedToImport'));
    } finally {
      setIsImporting(false);
    }
  };

  // Open settings for permission
  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  // Render contact item
  const renderContact = ({ item }: { item: DeviceContact }) => (
    <TouchableOpacity
      style={[
        styles.contactItem,
        { backgroundColor: item.selected ? (isDark ? primary[900] : primary[50]) : 'transparent' },
      ]}
      onPress={() => toggleContact(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, item.selected && styles.checkboxSelected]}>
        {item.selected && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <View style={styles.contactInfo}>
        <Text size="base" weight="medium" color={colors.text} numberOfLines={1}>
          {item.name}
        </Text>
        <Text size="sm" color={colors.textSecondary} numberOfLines={1}>
          {[item.phone, item.email].filter(Boolean).join(' • ')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Render permission denied state
  const renderPermissionDenied = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="lock-closed-outline" size={64} color={colors.textMuted} />
      <Text size="lg" weight="semibold" color={colors.text} style={styles.centerTitle}>
        {t('sharedLists.import.contactsAccessRequired')}
      </Text>
      <Text size="sm" color={colors.textSecondary} style={styles.centerDescription}>
        {t('sharedLists.import.grantAccessMessage')}
      </Text>
      <TouchableOpacity
        style={[styles.settingsButton, { backgroundColor: primary[500] }]}
        onPress={handleOpenSettings}
        activeOpacity={0.8}
      >
        <Ionicons name="settings-outline" size={20} color="#fff" />
        <Text size="sm" weight="semibold" color="#fff">
          {t('common.openSettings')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render empty state
  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.centerContainer}>
        <Ionicons name="people-outline" size={64} color={colors.textMuted} />
        <Text size="lg" weight="semibold" color={colors.text} style={styles.centerTitle}>
          {searchQuery
            ? t('sharedLists.import.noResults')
            : t('sharedLists.import.noContactsAvailable')}
        </Text>
        <Text size="sm" color={colors.textSecondary} style={styles.centerDescription}>
          {searchQuery
            ? t('sharedLists.import.tryDifferentSearch')
            : t('sharedLists.import.allContactsInList')}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => onClose()}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => onClose()} disabled={isImporting}>
            <Text size="base" color={colors.primary}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
          <Text size="lg" weight="semibold" color={colors.text}>
            {t('sharedLists.contacts.importFromPhone')}
          </Text>
          <TouchableOpacity onPress={handleImport} disabled={isImporting || selectedCount === 0}>
            {isImporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                size="base"
                weight="semibold"
                color={selectedCount > 0 ? colors.primary : colors.textMuted}
              >
                {t('sharedLists.import.import')}
                {selectedCount > 0 ? ` (${selectedCount})` : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text size="sm" color={colors.textSecondary} style={styles.loadingText}>
              {t('sharedLists.import.loadingContacts')}
            </Text>
          </View>
        ) : permissionStatus !== 'granted' ? (
          renderPermissionDenied()
        ) : (
          <>
            {/* Search */}
            <View style={styles.searchContainer}>
              <View
                style={[
                  styles.searchInput,
                  { backgroundColor: colors.inputBackground, borderColor: colors.border },
                ]}
              >
                <Ionicons name="search" size={20} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchTextInput, { color: colors.text }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t('sharedLists.import.searchContacts')}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Select All */}
            {filteredContacts.length > 0 && (
              <TouchableOpacity
                style={[styles.selectAllRow, { borderBottomColor: colors.border }]}
                onPress={toggleSelectAll}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    filteredContacts.every(c => c.selected) && styles.checkboxSelected,
                  ]}
                >
                  {filteredContacts.every(c => c.selected) && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text size="sm" weight="medium" color={colors.text}>
                  {t('sharedLists.import.selectAll')} ({filteredContacts.length})
                </Text>
              </TouchableOpacity>
            )}

            {/* Contacts List */}
            <FlatList
              data={filteredContacts}
              keyExtractor={item => item.id}
              renderItem={renderContact}
              contentContainerStyle={[
                styles.listContent,
                filteredContacts.length === 0 && styles.emptyListContent,
              ]}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmpty}
            />
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    borderBottomWidth: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacingPixels[3],
  },
  searchContainer: {
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radiusPixels.md,
    paddingHorizontal: spacingPixels[3],
    gap: spacingPixels[2],
  },
  searchTextInput: {
    flex: 1,
    paddingVertical: spacingPixels[2.5],
    fontSize: fontSizePixels.base,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    borderBottomWidth: 1,
    gap: spacingPixels[3],
  },
  listContent: {
    paddingHorizontal: spacingPixels[4],
    paddingBottom: spacingPixels[4],
  },
  emptyListContent: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingPixels[3],
    paddingHorizontal: spacingPixels[2],
    borderRadius: radiusPixels.md,
    marginBottom: spacingPixels[1],
    gap: spacingPixels[3],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: neutral[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: primary[500],
    borderColor: primary[500],
  },
  contactInfo: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacingPixels[8],
  },
  centerTitle: {
    marginTop: spacingPixels[4],
    textAlign: 'center',
  },
  centerDescription: {
    marginTop: spacingPixels[2],
    textAlign: 'center',
    lineHeight: 20,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacingPixels[6],
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    borderRadius: radiusPixels.lg,
    gap: spacingPixels[2],
  },
});

export default ImportContactsModal;
