/**
 * SharedListDetail Screen
 *
 * Displays and manages contacts within a shared contact list.
 * Features:
 * - View all contacts in the list
 * - Add contacts from phone book
 * - Add contacts manually
 * - Edit/Delete contacts
 * - Search contacts
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels, fontSizePixels } from '@rallia/design-system';
import { primary, neutral } from '@rallia/design-system';
import {
  useSharedContacts,
  useDeleteSharedContact,
  useSharedContactsRealtime,
  type SharedContact,
} from '@rallia/shared-hooks';
import { useThemeStyles, useTranslation, type TranslationKey } from '../hooks';
import type { CommunityStackParamList } from '../navigation/types';
import { AddContactModal, ContactCard, ImportContactsModal } from '../features/shared-lists';

type RouteParams = {
  SharedListDetail: {
    listId: string;
    listName: string;
  };
};

const SharedListDetail: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'SharedListDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<CommunityStackParamList>>();
  const { colors, isDark } = useThemeStyles();
  const { t } = useTranslation();
  const { listId, listName } = route.params;

  // State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingContact, setEditingContact] = useState<SharedContact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Queries and mutations
  const { data: contacts = [], isLoading, isRefetching, refetch } = useSharedContacts(listId);
  const deleteContactMutation = useDeleteSharedContact();

  // Filter contacts based on search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase().trim();
    return contacts.filter(contact => {
      const name = contact.name?.toLowerCase() || '';
      const phone = contact.phone?.toLowerCase() || '';
      const email = contact.email?.toLowerCase() || '';
      return name.includes(query) || phone.includes(query) || email.includes(query);
    });
  }, [contacts, searchQuery]);

  // Subscribe to real-time updates for this list's contacts
  useSharedContactsRealtime(listId);

  // Set header title
  useEffect(() => {
    navigation.setOptions({
      title: listName,
    });
  }, [navigation, listName]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Add contact manually
  const handleAddManually = useCallback(() => {
    setEditingContact(null);
    setShowAddModal(true);
  }, []);

  // Import from phone book
  const handleImportFromPhoneBook = useCallback(() => {
    setShowImportModal(true);
  }, []);

  // Edit contact
  const handleEditContact = useCallback((contact: SharedContact) => {
    setEditingContact(contact);
    setShowAddModal(true);
  }, []);

  // Delete contact
  const handleDeleteContact = useCallback(
    (contact: SharedContact) => {
      Alert.alert(
        t('sharedLists.deleteContact' as TranslationKey),
        t('sharedLists.deleteContactConfirm' as TranslationKey, { name: contact.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteContactMutation.mutateAsync({ contactId: contact.id, listId });
              } catch (error) {
                console.error('Failed to delete contact:', error);
                Alert.alert(
                  t('common.error'),
                  t('sharedLists.failedToDeleteContact' as TranslationKey)
                );
              }
            },
          },
        ]
      );
    },
    [deleteContactMutation, listId, t]
  );

  // Modal close handlers
  const handleAddModalClose = useCallback(() => {
    setShowAddModal(false);
    setEditingContact(null);
    // No need to manually refetch - React Query + Realtime handles it
  }, []);

  const handleImportModalClose = useCallback(() => {
    setShowImportModal(false);
    // No need to manually refetch - React Query + Realtime handles it
  }, []);

  // Render contact item
  const renderContactItem = useCallback(
    ({ item }: { item: SharedContact }) => (
      <ContactCard
        contact={item}
        colors={colors}
        isDark={isDark}
        onEdit={() => handleEditContact(item)}
        onDelete={() => handleDeleteContact(item)}
      />
    ),
    [colors, isDark, handleEditContact, handleDeleteContact]
  );

  // Render empty state
  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="person-add-outline" size={64} color={colors.textMuted} />
        <Text size="lg" weight="semibold" color={colors.textMuted} style={styles.emptyTitle}>
          {t('sharedLists.emptyState.noContacts' as TranslationKey)}
        </Text>
        <Text size="sm" color={colors.textMuted} style={styles.emptyDescription}>
          {t('sharedLists.emptyState.addContacts' as TranslationKey)}
        </Text>

        <View style={styles.emptyButtons}>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: primary[500] }]}
            onPress={handleImportFromPhoneBook}
            activeOpacity={0.8}
          >
            <Ionicons name="phone-portrait-outline" size={20} color="#fff" />
            <Text size="sm" weight="semibold" color="#fff">
              {t('sharedLists.importFromPhone' as TranslationKey)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.emptyButton, styles.emptyButtonOutline, { borderColor: colors.border }]}
            onPress={handleAddManually}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color={colors.text} />
            <Text size="sm" weight="semibold" color={colors.text}>
              {t('sharedLists.addManually' as TranslationKey)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['bottom']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      {/* Header with Search and Add Buttons */}
      {contacts.length > 0 && (
        <View style={styles.header}>
          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t('sharedLists.searchContacts' as TranslationKey)}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Count and Buttons Row */}
          <View style={styles.headerRow}>
            <Text size="sm" color={colors.textSecondary}>
              {t('sharedLists.contactCount' as TranslationKey, { count: filteredContacts.length })}
              {searchQuery &&
                contacts.length !== filteredContacts.length &&
                ` (${t('sharedLists.ofTotal' as TranslationKey, { total: contacts.length })})`}
            </Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[
                  styles.headerButton,
                  { backgroundColor: isDark ? neutral[700] : neutral[100] },
                ]}
                onPress={handleImportFromPhoneBook}
                activeOpacity={0.8}
              >
                <Ionicons name="phone-portrait-outline" size={18} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerButton, { backgroundColor: primary[500] }]}
                onPress={handleAddManually}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Contacts List */}
      <FlatList
        data={filteredContacts}
        keyExtractor={item => item.id}
        renderItem={renderContactItem}
        contentContainerStyle={[
          styles.listContent,
          filteredContacts.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />

      {/* Add/Edit Contact Modal */}
      <AddContactModal
        visible={showAddModal}
        listId={listId}
        editingContact={editingContact}
        colors={colors}
        isDark={isDark}
        onClose={handleAddModalClose}
      />

      {/* Import from Phone Book Modal */}
      <ImportContactsModal
        visible={showImportModal}
        listId={listId}
        existingContacts={contacts}
        colors={colors}
        isDark={isDark}
        onClose={handleImportModalClose}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    gap: spacingPixels[3],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radiusPixels.lg,
    paddingHorizontal: spacingPixels[3],
    height: 40,
    gap: spacingPixels[2],
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizePixels.sm,
    paddingVertical: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2],
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: radiusPixels.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacingPixels[4],
    paddingBottom: spacingPixels[4],
  },
  emptyListContent: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacingPixels[8],
  },
  emptyTitle: {
    marginTop: spacingPixels[4],
    textAlign: 'center',
  },
  emptyDescription: {
    marginTop: spacingPixels[2],
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButtons: {
    marginTop: spacingPixels[6],
    gap: spacingPixels[3],
    width: '100%',
    maxWidth: 280,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
    borderRadius: radiusPixels.lg,
    gap: spacingPixels[2],
  },
  emptyButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
});

export default SharedListDetail;
