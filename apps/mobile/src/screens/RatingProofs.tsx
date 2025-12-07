import React, { useState, useEffect } from 'react';
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
import { supabase } from '@rallia/shared-services';
import { RatingProof, RatingProofsScreenParams } from '@rallia/shared-types';
import AddRatingProofOverlay from '../features/ratings/components/AddRatingProofOverlay';
import { withTimeout, getNetworkErrorMessage } from '../utils/networkTimeout';

type RatingProofsRouteProp = RouteProp<
  { RatingProofs: RatingProofsScreenParams },
  'RatingProofs'
>;

const RatingProofs: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RatingProofsRouteProp>();
  const { playerRatingScoreId, sportName, ratingValue, isOwnProfile } = route.params;

  const [proofs, setProofs] = useState<RatingProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [showAddProofOverlay, setShowAddProofOverlay] = useState(false);

  useEffect(() => {
    fetchProofs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerRatingScoreId, filter]);

  const fetchProofs = async () => {
    setLoading(true);
    try {
      // Build query based on filters
      let query = supabase
        .from('rating_proofs')
        .select(`
          *,
          file:files(*),
          reviewed_by_profile:profile!reviewed_by(display_name, profile_picture_url)
        `)
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
      if (__DEV__) console.error('Error fetching rating proofs:', error);
      Alert.alert('Error', getNetworkErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleAddProof = () => {
    setShowAddProofOverlay(true);
  };

  const handleSelectProofType = (type: 'external_link' | 'video' | 'image' | 'document') => {
    // TODO: Open appropriate input form based on type
    if (__DEV__) console.log('Selected proof type:', type);
    Alert.alert('Coming Soon', `Adding ${type} proof will be implemented next`);
  };

  const handleEditProof = (proof: RatingProof) => {
    // TODO: Open edit overlay
    if (__DEV__) console.log('Edit proof:', proof.id);
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
                (async () => supabase
                  .from('rating_proofs')
                  .update({ is_active: false })
                  .eq('id', proofId))(),
                10000,
                'Failed to delete proof - connection timeout'
              );

              if (result.error) throw result.error;

              Alert.alert('Success', 'Proof deleted successfully');
              fetchProofs();
            } catch (error) {
              if (__DEV__) console.error('Error deleting proof:', error);
              Alert.alert('Error', getNetworkErrorMessage(error));
            }
          },
        },
      ]
    );
  };



  const getProofTypeBadge = (proof: RatingProof) => {
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

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { text: 'Verified', color: '#4CAF50' };
      case 'rejected':
        return { text: 'Rejected', color: '#F44336' };
      case 'pending':
        return { text: 'Unverified', color: '#FF9800' };
      default:
        return { text: 'Pending', color: '#999' };
    }
  };

  const renderProofCard = ({ item }: { item: RatingProof }) => {
    const verificationBadge = getVerificationBadge(item.status);
    
    return (
      <View style={styles.proofCard}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Text size="base" weight="semibold" color="#000">
              {item.title}
            </Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color="#999" />
              <Text size="sm" color="#999" style={styles.dateText}>
                {new Date(item.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
          
          {/* Rating Badge */}
          <View style={styles.ratingBadge}>
            <Text size="sm" weight="bold" color="#fff">
              {ratingValue.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* Badges Row */}
        <View style={styles.badgesRow}>
          <View style={[styles.typeBadge, { backgroundColor: '#4DB8A8' }]}>
            <Text size="xs" weight="medium" color="#fff">
              {getProofTypeBadge(item)}
            </Text>
          </View>
          <View style={[styles.verificationBadge, { backgroundColor: verificationBadge.color }]}>
            <Text size="xs" weight="medium" color="#fff">
              {verificationBadge.text}
            </Text>
          </View>
        </View>

        {/* Action Icons */}
        {isOwnProfile && (
          <View style={styles.actionIcons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleEditProof(item)}
            >
              <Ionicons name="pencil" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleDeleteProof(item.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#EF6F7B" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="folder-open-outline" size={64} color="#CCC" />
      <Text size="lg" weight="semibold" color="#999" style={styles.emptyTitle}>
        No Proofs Yet
      </Text>
      <Text size="sm" color="#999" style={styles.emptyText}>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Mint Green Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text size="lg" weight="semibold" color="#000">
          Rating Proofs
        </Text>
        {isOwnProfile && (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleAddProof}
          >
            <Ionicons name="add" size={28} color="#000" />
          </TouchableOpacity>
        )}
        {!isOwnProfile && <View style={styles.headerButton} />}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4DB8A8" />
        </View>
      ) : (
        <View style={styles.content}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text size="lg" weight="bold" color="#000">
              My Rating Proofs
            </Text>
            <TouchableOpacity>
              <Ionicons name="information-circle-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Proofs List */}
          <FlatList
            data={proofs}
            renderItem={renderProofCard}
            keyExtractor={(item) => item.id}
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#A8E6CF', // Mint green
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  proofCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardLeft: {
    flex: 1,
    marginRight: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateText: {
    marginLeft: 4,
  },
  ratingBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4DB8A8', // Teal
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verificationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
  },
  iconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    minWidth: 200,
  },
});

export default RatingProofs;

