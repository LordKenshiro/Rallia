import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Text, Button } from '@rallia/shared-components';
import { supabase, Logger } from '@rallia/shared-services';
import { RatingProofWithFile, RatingProofsScreenParams } from '@rallia/shared-types';
import AddRatingProofOverlay from '../features/ratings/components/AddRatingProofOverlay';
import { withTimeout, getNetworkErrorMessage } from '../utils/networkTimeout';
import { useThemeStyles, useTranslation } from '../hooks';
import { formatDateShort } from '../utils/dateFormatting';
import {
  spacingPixels,
  radiusPixels,
  fontSizePixels,
  fontWeightNumeric,
  shadowsNative,
  status,
  primary,
} from '@rallia/design-system';

type RatingProofsRouteProp = RouteProp<{ RatingProofs: RatingProofsScreenParams }, 'RatingProofs'>;

const RatingProofs: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RatingProofsRouteProp>();
  const { playerRatingScoreId, sportName: _sportName, ratingValue, isOwnProfile } = route.params;
  const { colors, shadows } = useThemeStyles();
  const { locale } = useTranslation();

  const [proofs, setProofs] = useState<RatingProofWithFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [showAddProofOverlay, setShowAddProofOverlay] = useState(false);

  // Define handleAddProof before useLayoutEffect that uses it
  const handleAddProof = useCallback(() => {
    setShowAddProofOverlay(true);
  }, []);

  // Configure header right button for add action
  useLayoutEffect(() => {
    if (isOwnProfile) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity onPress={handleAddProof} style={{ marginRight: spacingPixels[2] }}>
            <Ionicons name="add" size={28} color={colors.headerForeground} />
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({
        headerRight: undefined,
      });
    }
  }, [isOwnProfile, navigation, colors.headerForeground, handleAddProof]);

  useEffect(() => {
    fetchProofs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerRatingScoreId, filter]);

  const fetchProofs = async () => {
    setLoading(true);
    try {
      // Build query based on filters
      let query = supabase
        .from('rating_proof')
        .select(
          `
          *,
          file:file(*),
          reviewed_by_profile:profile!reviewed_by(display_name, profile_picture_url)
        `
        )
        .eq('player_rating_score_id', playerRatingScoreId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      // If not own profile, only show approved proofs
      if (!isOwnProfile) {
        query = query.eq('status', 'approved');
      }

      // Execute query with timeout
      const result = await withTimeout(
        (async () => query)(),
        15000,
        'Failed to load rating proofs - connection timeout'
      );

      if (result.error) throw result.error;
      setProofs(result.data || []);
    } catch (error) {
      Logger.error('Failed to fetch rating proofs', error as Error, { playerRatingScoreId });
      Alert.alert('Error', getNetworkErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProofType = (type: 'external_link' | 'video' | 'image' | 'document') => {
    // TODO: Open appropriate input form based on type
    Logger.logUserAction('select_proof_type', { type, playerRatingScoreId });
    Alert.alert('Coming Soon', `Adding ${type} proof will be implemented next`);
  };

  const handleEditProof = (proof: RatingProofWithFile) => {
    // TODO: Open edit overlay
    Logger.logUserAction('edit_proof_pressed', { proofId: proof.id, playerRatingScoreId });
    Alert.alert('Coming Soon', 'Edit proof feature will be implemented next');
  };

  const handleDeleteProof = async (proofId: string) => {
    Alert.alert(
      'Delete Proof',
      'Are you sure you want to delete this proof? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await withTimeout(
                (async () =>
                  supabase.from('rating_proof').update({ is_active: false }).eq('id', proofId))(),
                10000,
                'Failed to delete proof - connection timeout'
              );

              if (result.error) throw result.error;

              Alert.alert('Success', 'Proof deleted successfully');
              fetchProofs();
            } catch (error) {
              Logger.error('Failed to delete proof', error as Error, {
                proofId,
                playerRatingScoreId,
              });
              Alert.alert('Error', getNetworkErrorMessage(error));
            }
          },
        },
      ]
    );
  };

  const getProofTypeBadge = (proof: RatingProofWithFile) => {
    if (proof.proof_type === 'external_link') {
      return 'External Link';
    }
    if (proof.file) {
      switch (proof.file.file_type) {
        case 'video':
          return 'Video Recording';
        case 'image':
          return 'Image';
        case 'document':
          return 'Official Rating';
        default:
          return 'File';
      }
    }
    return 'Proof';
  };

  const getVerificationBadge = (proofStatus: string) => {
    switch (proofStatus) {
      case 'approved':
        return { text: 'Verified', color: status.success.DEFAULT };
      case 'rejected':
        return { text: 'Rejected', color: status.error.DEFAULT };
      case 'pending':
        return { text: 'Unverified', color: status.warning.DEFAULT };
      default:
        return { text: 'Pending', color: colors.textMuted };
    }
  };

  const renderProofCard = ({ item }: { item: RatingProofWithFile }) => {
    const verificationBadge = getVerificationBadge(item.status);

    return (
      <View
        style={[styles.proofCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Text size="base" weight="semibold" color={colors.text}>
              {item.title}
            </Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text size="sm" color={colors.textMuted} style={styles.dateText}>
                {formatDateShort(item.created_at, locale)}
              </Text>
            </View>
          </View>

          {/* Rating Badge */}
          <View style={[styles.ratingBadge, { backgroundColor: colors.primary }]}>
            <Text size="sm" weight="bold" color={colors.primaryForeground}>
              {ratingValue.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* Badges Row */}
        <View style={styles.badgesRow}>
          <View style={[styles.typeBadge, { backgroundColor: colors.primary }]}>
            <Text size="xs" weight="medium" color={colors.primaryForeground}>
              {getProofTypeBadge(item)}
            </Text>
          </View>
          <View style={[styles.verificationBadge, { backgroundColor: verificationBadge.color }]}>
            <Text size="xs" weight="medium" color={colors.primaryForeground}>
              {verificationBadge.text}
            </Text>
          </View>
        </View>

        {/* Action Icons */}
        {isOwnProfile && (
          <View style={styles.actionIcons}>
            <TouchableOpacity style={styles.iconButton} onPress={() => handleEditProof(item)}>
              <Ionicons name="pencil" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => handleDeleteProof(item.id)}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="folder-open-outline" size={64} color={colors.textMuted} />
      <Text size="lg" weight="semibold" color={colors.textMuted} style={styles.emptyTitle}>
        No Proofs Yet
      </Text>
      <Text size="sm" color={colors.textMuted} style={styles.emptyText}>
        {isOwnProfile
          ? 'Add proof of your rating to help others verify your skill level'
          : 'This user has not added any rating proofs yet'}
      </Text>
      {isOwnProfile && (
        <Button variant="primary" onPress={handleAddProof} style={styles.emptyButton}>
          Add Your First Proof
        </Button>
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      {/* Content */}
      {loading ? (
        <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={[styles.content, { backgroundColor: colors.card }]}>
          {/* Title Section */}
          <View style={[styles.titleSection, { backgroundColor: colors.card }]}>
            <Text size="lg" weight="bold" color={colors.text}>
              My Rating Proofs
            </Text>
            <TouchableOpacity>
              <Ionicons name="information-circle-outline" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Proofs List */}
          <FlatList
            data={proofs}
            renderItem={renderProofCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Add Proof Overlay */}
      <AddRatingProofOverlay
        visible={showAddProofOverlay}
        onClose={() => setShowAddProofOverlay(false)}
        onSelectProofType={handleSelectProofType}
      />
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
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingPixels[5],
    paddingVertical: spacingPixels[4],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacingPixels[5],
    paddingBottom: spacingPixels[5],
  },
  proofCard: {
    borderRadius: radiusPixels.xl,
    padding: spacingPixels[4],
    marginBottom: spacingPixels[3],
    ...shadowsNative.sm,
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    // borderColor will be set dynamically using colors.border
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacingPixels[3],
  },
  cardLeft: {
    flex: 1,
    marginRight: spacingPixels[3],
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacingPixels[1],
  },
  dateText: {
    marginLeft: spacingPixels[1],
  },
  ratingBadge: {
    width: spacingPixels[9],
    height: spacingPixels[9],
    borderRadius: radiusPixels.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingPixels[2],
    marginBottom: spacingPixels[3],
  },
  typeBadge: {
    paddingHorizontal: spacingPixels[2.5],
    paddingVertical: spacingPixels[1],
    borderRadius: radiusPixels.xl,
  },
  verificationBadge: {
    paddingHorizontal: spacingPixels[2.5],
    paddingVertical: spacingPixels[1],
    borderRadius: radiusPixels.xl,
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacingPixels[4],
  },
  iconButton: {
    width: spacingPixels[8],
    height: spacingPixels[8],
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacingPixels[8],
    paddingVertical: 60, // 15 * 4px base unit
  },
  emptyTitle: {
    marginTop: spacingPixels[4],
    marginBottom: spacingPixels[2],
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: fontSizePixels.sm * 1.43,
    marginBottom: spacingPixels[6],
  },
  emptyButton: {
    minWidth: 200, // 50 * 4px base unit
  },
});

export default RatingProofs;
