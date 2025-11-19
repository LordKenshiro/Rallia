import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface Match {
  id: string;
  title: string;
  ageRestriction: string;
  date: string;
  time: string;
  location: string;
  court: string;
  tags: string[];
  participantCount: number;
  participantImages?: string[];
}

interface MatchCardProps {
  match: Match;
  onPress?: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onPress }) => {
  const getTagColor = (tag: string): string => {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('competitive')) return '#00A896';
    if (tagLower.includes('practice')) return '#00A896';
    if (tagLower.includes('men')) return '#4ECDC4';
    if (tagLower.includes('women')) return '#FF6B9D';
    if (tagLower.includes('open')) return '#95E1D3';
    if (tagLower.includes('closed')) return '#AA96DA';
    if (tagLower.includes('all gender')) return '#6C63FF';
    return '#00B8A9';
  };

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Profile Images Section */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.profileImagesContainer}>
            {match.participantImages && match.participantImages.length > 0 ? (
              match.participantImages.slice(0, 2).map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image }}
                  style={[
                    styles.profileImage,
                    index > 0 && styles.profileImageOverlap,
                  ]}
                />
              ))
            ) : (
              <View style={styles.placeholderProfile}>
                <Ionicons name="person" size={20} color="#999" />
              </View>
            )}
            {match.participantCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{match.participantCount}</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Age Badge */}
        <View style={styles.ageBadge}>
          <Text style={styles.ageText}>{match.ageRestriction}</Text>
        </View>
      </View>

      {/* Match Title */}
      <Text style={styles.title}>{match.title}</Text>

      {/* Date & Time */}
      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={14} color="#666" />
        <Text style={styles.infoText}>
          {match.date}, {match.time}
        </Text>
      </View>

      {/* Location */}
      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={14} color="#666" />
        <Text style={styles.infoText}>
          {match.location} - {match.court}
        </Text>
      </View>

      {/* Tags */}
      <View style={styles.tagsContainer}>
        {match.tags.map((tag, index) => (
          <View 
            key={index} 
            style={[styles.tag, { backgroundColor: getTagColor(tag) }]}
          >
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileImageOverlap: {
    marginLeft: -12,
  },
  placeholderProfile: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00B8A9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ageBadge: {
    backgroundColor: '#00B8A9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default MatchCard;
