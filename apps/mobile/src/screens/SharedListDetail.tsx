/**
 * SharedListDetail Screen
 *
 * Displays and manages contacts within a shared contact list.
 * Features:
 * - View all contacts in the list
 * - Add contacts from phone book
 * - Add contacts manually
 * - Edit/Delete contacts
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@rallia/shared-components';
import { spacingPixels, radiusPixels } from '@rallia/design-system';
import { primary, neutral } from '@rallia/design-system';
import {
  getSharedContacts,
  deleteSharedContact,
  type SharedContact,
} from '@rallia/shared-services';
import { useThemeStyles } from '../hooks';
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
  const { listId, listName } = route.params;

  // State
  const [contacts, setContacts] = useState<SharedContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingContact, setEditingContact] = useState<SharedContact | null>(null);

  // Set header title
  useEffect(() => {
    navigation.setOptions({
      title: listName,
    });
  }, [navigation, listName]);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    try {
      const data = await getSharedContacts(listId);
      setContacts(data);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [listId]);

  // Initial load
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchContacts();
  }, [fetchContacts]);

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
  const handleDeleteContact = useCallback((contact: SharedContact) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to remove "${contact.name}" from this list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSharedContact(contact.id);
              setContacts(prev => prev.filter(c => c.id !== contact.id));
            } catch (error) {
              console.error('Failed to delete contact:', error);
              Alert.alert('Error', 'Failed to delete the contact. Please try again.');
            }
          },
        },
      ]
    );
  }, []);

  // Modal close handlers
  const handleAddModalClose = useCallback(
    (refreshNeeded?: boolean) => {
      setShowAddModal(false);
      setEditingContact(null);
      if (refreshNeeded) {
        fetchContacts();
      }
    },
    [fetchContacts]
  );

  const handleImportModalClose = useCallback(
    (refreshNeeded?: boolean) => {
      setShowImportModal(false);
      if (refreshNeeded) {
        fetchContacts();
      }
    },
    [fetchContacts]
  );

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
          No Contacts Yet
        </Text>
        <Text size="sm" color={colors.textMuted} style={styles.emptyDescription}>
          Add contacts to this list to easily invite them to your matches
        </Text>

        <View style={styles.emptyButtons}>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: primary[500] }]}
            onPress={handleImportFromPhoneBook}
            activeOpacity={0.8}
          >
            <Ionicons name="phone-portrait-outline" size={20} color="#fff" />
            <Text size="sm" weight="semibold" color="#fff">
              Import from Phone
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.emptyButton, styles.emptyButtonOutline, { borderColor: colors.border }]}
            onPress={handleAddManually}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color={colors.text} />
            <Text size="sm" weight="semibold" color={colors.text}>
              Add Manually
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
      {/* Header with Add Buttons */}
      {contacts.length > 0 && (
        <View style={styles.header}>
          <Text size="sm" color={colors.textSecondary}>
            {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
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
      )}

      {/* Contacts List */}
      <FlatList
        data={contacts}
        keyExtractor={item => item.id}
        renderItem={renderContactItem}
        contentContainerStyle={[
          styles.listContent,
          contacts.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingPixels[4],
    paddingVertical: spacingPixels[3],
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
