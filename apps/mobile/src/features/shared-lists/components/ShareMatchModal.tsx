/**
 * ShareMatchModal Component
 * Modal for sharing matches with contacts from shared lists
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useToast } from '@rallia/shared-components';
import { spacingPixels, radiusPixels, fontSizePixels } from '@rallia/design-system';
import { primary, neutral } from '@rallia/design-system';
import {
  getSharedContactLists,
  getSharedContacts,
  shareMatchWithContacts,
  type SharedContactList,
  type SharedContact,
  type ShareChannel,
} from '@rallia/shared-services';
import { usePlayerMatches } from '@rallia/shared-hooks';
import { useTranslation, type TranslationKey } from '../../../hooks';

// Local interface to ensure TypeScript recognizes match properties
// (workaround for TS language server cache issues with extended types)
interface MatchItem {
  id: string;
  match_date: string;
  start_time: string;
  location_name?: string | null;
  facility?: { name: string } | null;
  sport?: { name: string } | null;
}

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

interface ShareMatchModalProps {
  visible: boolean;
  playerId: string;
  colors: ThemeColors;
  isDark: boolean;
  onClose: () => void;
}

type Step = 'select-match' | 'select-contacts' | 'confirm';

interface SelectedContact {
  id: string;
  listId?: string;
  name: string;
  phone?: string;
  email?: string;
}

const ShareMatchModal: React.FC<ShareMatchModalProps> = ({
  visible,
  playerId,
  colors,
  isDark,
  onClose,
}) => {
  const toast = useToast();
  const { t } = useTranslation();

  // State
  const [step, setStep] = useState<Step>('select-match');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<SelectedContact[]>([]);
  const [lists, setLists] = useState<SharedContactList[]>([]);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [listContacts, setListContacts] = useState<Record<string, SharedContact[]>>({});
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState<Record<string, boolean>>({});
  const [isSharing, setIsSharing] = useState(false);

  // Fetch upcoming matches
  const { matches: upcomingMatches, isLoading: isLoadingMatches } = usePlayerMatches({
    userId: playerId,
    timeFilter: 'upcoming',
  });

  // Fetch shared lists
  const fetchLists = useCallback(async () => {
    setIsLoadingLists(true);
    try {
      const data = await getSharedContactLists();
      setLists(data);
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    } finally {
      setIsLoadingLists(false);
    }
  }, []);

  // Fetch contacts for a list
  const fetchListContacts = useCallback(
    async (listId: string) => {
      if (listContacts[listId]) return; // Already loaded

      setIsLoadingContacts(prev => ({ ...prev, [listId]: true }));
      try {
        const contacts = await getSharedContacts(listId);
        setListContacts(prev => ({ ...prev, [listId]: contacts }));
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
      } finally {
        setIsLoadingContacts(prev => ({ ...prev, [listId]: false }));
      }
    },
    [listContacts]
  );

  // Load lists when modal opens and we're on contact selection step
  useEffect(() => {
    if (visible && step === 'select-contacts') {
      fetchLists();
    }
  }, [visible, step, fetchLists]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setStep('select-match');
      setSelectedMatchId(null);
      setSelectedContacts([]);
      setExpandedListId(null);
    }
  }, [visible]);

  // Get the selected match details
  const selectedMatch = useMemo(() => {
    if (!selectedMatchId) return null;
    return (upcomingMatches as MatchItem[] | undefined)?.find(m => m.id === selectedMatchId);
  }, [selectedMatchId, upcomingMatches]);

  // Toggle list expansion
  const handleToggleList = useCallback(
    (listId: string) => {
      if (expandedListId === listId) {
        setExpandedListId(null);
      } else {
        setExpandedListId(listId);
        fetchListContacts(listId);
      }
    },
    [expandedListId, fetchListContacts]
  );

  // Toggle contact selection
  const handleToggleContact = useCallback((contact: SharedContact, listId: string) => {
    setSelectedContacts(prev => {
      const existing = prev.find(c => c.id === contact.id);
      if (existing) {
        return prev.filter(c => c.id !== contact.id);
      } else {
        return [
          ...prev,
          {
            id: contact.id,
            listId,
            name: contact.name,
            phone: contact.phone || undefined,
            email: contact.email || undefined,
          },
        ];
      }
    });
  }, []);

  // Select all contacts from a list
  const handleSelectAllFromList = useCallback(
    (list: SharedContactList) => {
      const contacts = listContacts[list.id] || [];
      const allSelected = contacts.every(c => selectedContacts.some(sc => sc.id === c.id));

      if (allSelected) {
        // Deselect all from this list
        setSelectedContacts(prev => prev.filter(sc => sc.listId !== list.id));
      } else {
        // Select all from this list
        const newContacts = contacts
          .filter(c => !selectedContacts.some(sc => sc.id === c.id))
          .map(c => ({
            id: c.id,
            listId: list.id,
            name: c.name,
            phone: c.phone || undefined,
            email: c.email || undefined,
          }));
        setSelectedContacts(prev => [...prev, ...newContacts]);
      }
    },
    [listContacts, selectedContacts]
  );

  // Share via native share sheet
  const handleShare = useCallback(
    async (channel: ShareChannel) => {
      if (!selectedMatch || selectedContacts.length === 0) return;

      setIsSharing(true);
      try {
        const result = await shareMatchWithContacts({
          matchId: selectedMatch.id,
          channel,
          contacts: selectedContacts.map(c => ({
            contactId: c.id,
            listId: c.listId,
            name: c.name,
            phone: c.phone,
            email: c.email,
          })),
        });

        if (channel === 'share_sheet' || channel === 'copy_link') {
          // Use native share
          await Share.share({
            message: result.shareMessage,
            title: t('sharedLists.share.shareGame' as TranslationKey),
          });
        } else if (channel === 'sms') {
          // Open SMS with pre-filled message
          const phones = selectedContacts
            .filter(c => c.phone)
            .map(c => c.phone)
            .join(',');
          if (phones) {
            const smsUrl = `sms:${phones}?body=${encodeURIComponent(result.shareMessage)}`;
            await Linking.openURL(smsUrl);
          }
        } else if (channel === 'whatsapp') {
          // Open WhatsApp (can only send to one contact at a time)
          const firstPhone = selectedContacts.find(c => c.phone)?.phone;
          if (firstPhone) {
            const cleanPhone = firstPhone.replace(/\D/g, '');
            const waUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(result.shareMessage)}`;
            await Linking.openURL(waUrl);
          }
        } else if (channel === 'email') {
          // Open email client
          const emails = selectedContacts
            .filter(c => c.email)
            .map(c => c.email)
            .join(',');
          if (emails) {
            const subject = encodeURIComponent(
              t('sharedLists.share.gameInvitation' as TranslationKey)
            );
            const body = encodeURIComponent(result.shareMessage);
            const mailUrl = `mailto:${emails}?subject=${subject}&body=${body}`;
            await Linking.openURL(mailUrl);
          }
        }

        toast.success(
          t('sharedLists.share.invitationShared' as TranslationKey, {
            count: selectedContacts.length,
          })
        );
        onClose();
      } catch (error) {
        console.error('Failed to share:', error);
        toast.error(t('sharedLists.share.failedToShare' as TranslationKey));
      } finally {
        setIsSharing(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [selectedMatch, selectedContacts, onClose, toast]
  );

  // Render match item
  const renderMatchItem = useCallback(
    ({ item }: { item: MatchItem }) => {
      const isSelected = selectedMatchId === item.id;
      const matchDate = new Date(item.match_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const startTime = item.start_time?.substring(0, 5) || '';

      return (
        <TouchableOpacity
          style={[
            styles.matchItem,
            {
              backgroundColor: isSelected
                ? isDark
                  ? primary[900]
                  : primary[50]
                : colors.cardBackground,
              borderColor: isSelected ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setSelectedMatchId(item.id)}
        >
          <View style={styles.matchInfo}>
            <Text weight="semibold" style={{ color: colors.text }}>
              {item.sport?.name || 'Game'}
            </Text>
            <Text size="sm" style={{ color: colors.textSecondary }}>
              {matchDate} at {startTime}
            </Text>
            <Text size="sm" style={{ color: colors.textMuted }}>
              {item.location_name || item.facility?.name || 'Location TBD'}
            </Text>
          </View>
          {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
        </TouchableOpacity>
      );
    },
    [selectedMatchId, colors, isDark]
  );

  // Render list item with contacts
  const renderListItem = useCallback(
    ({ item }: { item: SharedContactList }) => {
      const isExpanded = expandedListId === item.id;
      const contacts = listContacts[item.id] || [];
      const isLoadingThisList = isLoadingContacts[item.id];
      const allSelected =
        contacts.length > 0 && contacts.every(c => selectedContacts.some(sc => sc.id === c.id));

      return (
        <View style={[styles.listItem, { borderColor: colors.border }]}>
          <TouchableOpacity style={styles.listHeader} onPress={() => handleToggleList(item.id)}>
            <View
              style={[styles.listIcon, { backgroundColor: isDark ? primary[800] : primary[100] }]}
            >
              <Ionicons name="people" size={20} color={isDark ? primary[300] : primary[600]} />
            </View>
            <View style={styles.listInfo}>
              <Text weight="semibold" style={{ color: colors.text }}>
                {item.name}
              </Text>
              <Text size="sm" style={{ color: colors.textSecondary }}>
                {item.contact_count === 1
                  ? t('sharedLists.contacts.contactCountSingular' as TranslationKey, {
                      count: item.contact_count,
                    })
                  : t('sharedLists.contacts.contactCount' as TranslationKey, {
                      count: item.contact_count,
                    })}
              </Text>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.contactsContainer}>
              {isLoadingThisList ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
              ) : contacts.length === 0 ? (
                <Text size="sm" style={[styles.emptyText, { color: colors.textMuted }]}>
                  {t('sharedLists.contacts.noContactsInList' as TranslationKey)}
                </Text>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.selectAllButton,
                      { backgroundColor: isDark ? neutral[800] : neutral[100] },
                    ]}
                    onPress={() => handleSelectAllFromList(item)}
                  >
                    <Ionicons
                      name={allSelected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={allSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text size="sm" style={{ color: colors.text, marginLeft: spacingPixels[2] }}>
                      {t('common.selectAll' as TranslationKey)}
                    </Text>
                  </TouchableOpacity>
                  {contacts.map(contact => {
                    const isSelected = selectedContacts.some(sc => sc.id === contact.id);
                    return (
                      <TouchableOpacity
                        key={contact.id}
                        style={styles.contactRow}
                        onPress={() => handleToggleContact(contact, item.id)}
                      >
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                        <View style={styles.contactInfo}>
                          <Text size="sm" style={{ color: colors.text }}>
                            {contact.name}
                          </Text>
                          {contact.phone && (
                            <Text size="xs" style={{ color: colors.textMuted }}>
                              {contact.phone}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </View>
          )}
        </View>
      );
    },
    [
      expandedListId,
      listContacts,
      isLoadingContacts,
      selectedContacts,
      colors,
      isDark,
      handleToggleList,
      handleToggleContact,
      handleSelectAllFromList,
      t,
    ]
  );

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 'select-match':
        return (
          <View style={styles.stepContent}>
            <Text
              weight="semibold"
              size="lg"
              style={{ color: colors.text, marginBottom: spacingPixels[3] }}
            >
              {t('sharedLists.share.selectMatch' as TranslationKey)}
            </Text>
            {isLoadingMatches ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : !upcomingMatches || upcomingMatches.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {t('sharedLists.share.noUpcomingMatches' as TranslationKey)}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {t('sharedLists.share.createMatchFirst' as TranslationKey)}
                </Text>
              </View>
            ) : (
              <FlatList
                data={upcomingMatches as MatchItem[] | undefined}
                renderItem={renderMatchItem}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.matchList}
              />
            )}
          </View>
        );

      case 'select-contacts':
        return (
          <View style={styles.stepContent}>
            <Text
              weight="semibold"
              size="lg"
              style={{ color: colors.text, marginBottom: spacingPixels[3] }}
            >
              {t('sharedLists.share.selectContacts' as TranslationKey)}
            </Text>
            {selectedContacts.length > 0 && (
              <View
                style={[
                  styles.selectedBadge,
                  { backgroundColor: isDark ? primary[900] : primary[50] },
                ]}
              >
                <Text size="sm" style={{ color: colors.primary }}>
                  {t('sharedLists.share.contactsSelected' as TranslationKey, {
                    count: selectedContacts.length,
                  })}
                </Text>
              </View>
            )}
            {isLoadingLists ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : lists.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {t('sharedLists.share.noSharedLists' as TranslationKey)}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {t('sharedLists.share.createListFirst' as TranslationKey)}
                </Text>
              </View>
            ) : (
              <FlatList
                data={lists}
                renderItem={renderListItem}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
              />
            )}
          </View>
        );

      case 'confirm':
        return (
          <View style={styles.stepContent}>
            <Text
              weight="semibold"
              size="lg"
              style={{ color: colors.text, marginBottom: spacingPixels[3] }}
            >
              {t('sharedLists.share.howToShare' as TranslationKey)}
            </Text>

            {/* Match summary */}
            {selectedMatch && (
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                ]}
              >
                <Ionicons name="calendar" size={20} color={colors.primary} />
                <View style={styles.summaryInfo}>
                  <Text weight="semibold" style={{ color: colors.text }}>
                    {selectedMatch.sport?.name || t('common.game' as TranslationKey)}
                  </Text>
                  <Text size="sm" style={{ color: colors.textSecondary }}>
                    {new Date(selectedMatch.match_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            )}

            {/* Recipients summary */}
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
            >
              <Ionicons name="people" size={20} color={colors.primary} />
              <View style={styles.summaryInfo}>
                <Text weight="semibold" style={{ color: colors.text }}>
                  {t('sharedLists.share.recipients' as TranslationKey, {
                    count: selectedContacts.length,
                  })}
                </Text>
                <Text size="sm" style={{ color: colors.textSecondary }} numberOfLines={1}>
                  {selectedContacts
                    .slice(0, 3)
                    .map(c => c.name)
                    .join(', ')}
                  {selectedContacts.length > 3
                    ? ` +${t('common.more' as TranslationKey, { count: selectedContacts.length - 3 })}`
                    : ''}
                </Text>
              </View>
            </View>

            {/* Share options */}
            <View style={styles.shareOptions}>
              <TouchableOpacity
                style={[
                  styles.shareOption,
                  { backgroundColor: isDark ? neutral[800] : neutral[100] },
                ]}
                onPress={() => handleShare('share_sheet')}
                disabled={isSharing}
              >
                <Ionicons name="share-outline" size={24} color={colors.primary} />
                <Text style={{ color: colors.text, marginTop: spacingPixels[1] }}>
                  {t('common.share' as TranslationKey)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.shareOption,
                  { backgroundColor: isDark ? neutral[800] : neutral[100] },
                ]}
                onPress={() => handleShare('sms')}
                disabled={isSharing || !selectedContacts.some(c => c.phone)}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={24}
                  color={selectedContacts.some(c => c.phone) ? colors.primary : colors.textMuted}
                />
                <Text
                  style={{
                    color: selectedContacts.some(c => c.phone) ? colors.text : colors.textMuted,
                    marginTop: spacingPixels[1],
                  }}
                >
                  SMS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.shareOption,
                  { backgroundColor: isDark ? neutral[800] : neutral[100] },
                ]}
                onPress={() => handleShare('whatsapp')}
                disabled={isSharing || !selectedContacts.some(c => c.phone)}
              >
                <Ionicons
                  name="logo-whatsapp"
                  size={24}
                  color={selectedContacts.some(c => c.phone) ? '#25D366' : colors.textMuted}
                />
                <Text
                  style={{
                    color: selectedContacts.some(c => c.phone) ? colors.text : colors.textMuted,
                    marginTop: spacingPixels[1],
                  }}
                >
                  WhatsApp
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.shareOption,
                  { backgroundColor: isDark ? neutral[800] : neutral[100] },
                ]}
                onPress={() => handleShare('email')}
                disabled={isSharing || !selectedContacts.some(c => c.email)}
              >
                <Ionicons
                  name="mail-outline"
                  size={24}
                  color={selectedContacts.some(c => c.email) ? colors.primary : colors.textMuted}
                />
                <Text
                  style={{
                    color: selectedContacts.some(c => c.email) ? colors.text : colors.textMuted,
                    marginTop: spacingPixels[1],
                  }}
                >
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            {isSharing && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            )}
          </View>
        );
    }
  };

  // Navigation buttons
  const canProceed = () => {
    switch (step) {
      case 'select-match':
        return !!selectedMatchId;
      case 'select-contacts':
        return selectedContacts.length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 'select-match') {
      setStep('select-contacts');
    } else if (step === 'select-contacts') {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'select-contacts') {
      setStep('select-match');
    } else if (step === 'confirm') {
      setStep('select-contacts');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={step === 'select-match' ? onClose : handleBack}>
            <Ionicons
              name={step === 'select-match' ? 'close' : 'arrow-back'}
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text weight="semibold" size="lg" style={{ color: colors.text }}>
            {t('sharedLists.share.shareMatch' as TranslationKey)}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
          <View
            style={[
              styles.stepLine,
              { backgroundColor: step !== 'select-match' ? colors.primary : colors.border },
            ]}
          />
          <View
            style={[
              styles.stepDot,
              { backgroundColor: step !== 'select-match' ? colors.primary : colors.border },
            ]}
          />
          <View
            style={[
              styles.stepLine,
              { backgroundColor: step === 'confirm' ? colors.primary : colors.border },
            ]}
          />
          <View
            style={[
              styles.stepDot,
              { backgroundColor: step === 'confirm' ? colors.primary : colors.border },
            ]}
          />
        </View>

        {/* Content */}
        {renderStepContent()}

        {/* Footer with Next button */}
        {step !== 'confirm' && (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.nextButton,
                { backgroundColor: canProceed() ? colors.primary : colors.border },
              ]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <Text weight="semibold" style={{ color: canProceed() ? '#fff' : colors.textMuted }}>
                {step === 'select-match'
                  ? t('sharedLists.share.selectContactsButton' as TranslationKey)
                  : t('common.continue' as TranslationKey)}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={canProceed() ? '#fff' : colors.textMuted}
                style={{ marginLeft: spacingPixels[2] }}
              />
            </TouchableOpacity>
          </View>
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[3],
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLine: {
    width: 40,
    height: 2,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: spacingPixels[4],
  },
  matchList: {
    paddingBottom: spacingPixels[4],
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[3],
    borderRadius: radiusPixels.lg,
    borderWidth: 2,
    marginBottom: spacingPixels[2],
  },
  matchInfo: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: spacingPixels[4],
  },
  listItem: {
    borderWidth: 1,
    borderRadius: radiusPixels.lg,
    marginBottom: spacingPixels[2],
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[3],
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: radiusPixels.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingPixels[3],
  },
  listInfo: {
    flex: 1,
  },
  contactsContainer: {
    paddingHorizontal: spacingPixels[3],
    paddingBottom: spacingPixels[3],
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[2],
    borderRadius: radiusPixels.md,
    marginBottom: spacingPixels[2],
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingPixels[2],
  },
  contactInfo: {
    marginLeft: spacingPixels[2],
    flex: 1,
  },
  selectedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacingPixels[3],
    paddingVertical: spacingPixels[1],
    borderRadius: radiusPixels.full,
    marginBottom: spacingPixels[3],
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingPixels[3],
    borderRadius: radiusPixels.lg,
    borderWidth: 1,
    marginBottom: spacingPixels[3],
  },
  summaryInfo: {
    marginLeft: spacingPixels[3],
    flex: 1,
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacingPixels[4],
  },
  shareOption: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
    borderRadius: radiusPixels.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[8],
  },
  emptyTitle: {
    fontSize: fontSizePixels.lg,
    fontWeight: '600',
    marginTop: spacingPixels[3],
  },
  emptySubtitle: {
    fontSize: fontSizePixels.sm,
    textAlign: 'center',
    marginTop: spacingPixels[2],
    paddingHorizontal: spacingPixels[4],
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: spacingPixels[3],
  },
  loader: {
    marginVertical: spacingPixels[4],
  },
  footer: {
    padding: spacingPixels[4],
    borderTopWidth: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingPixels[3],
    borderRadius: radiusPixels.lg,
  },
});

export default ShareMatchModal;
