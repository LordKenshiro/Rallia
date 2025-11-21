import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants';
import { Match } from '../../../types';

interface MatchCardProps {
  match: Match;
  onPress?: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onPress }) => {
  const getTagColor = (tag: string): string => {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('competitive')) return COLORS.competitive;
    if (tagLower.includes('practice')) return COLORS.practice;
    if (tagLower.includes('men')) return COLORS.menOnly;
    if (tagLower.includes('women')) return COLORS.womenOnly;
    if (tagLower.includes('open')) return COLORS.openAccess;
    if (tagLower.includes('closed')) return COLORS.closedAccess;
    if (tagLower.includes('all gender')) return COLORS.allGender;
    return COLORS.primary;
  };

  // Get position style for secondary images based on total count and index
  const getSecondaryPosition = (index: number, total: number) => {
    if (total === 3) {
      // For 3 players: top-right and bottom-right
      if (index === 0) return styles.secondaryTopSmall;
      if (index === 1) return styles.secondaryBottomSmall;
    } else if (total === 4) {
      // For doubles (4 players): top, right, bottom
      if (index === 0) return styles.secondaryTopSmall;
      if (index === 1) return styles.secondaryRightSmall;
      if (index === 2) return styles.secondaryBottomSmall;
    }
    return {};
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
            {/* Profile pictures */}
            {match.participantImages && match.participantImages.length > 0 ? (
              match.participantCount === 2 ? (
                // For 2 players: Same size images with slight overlap
                <View style={styles.twoPlayersContainer}>
                  <Image
                    source={{ uri: match.participantImages[0] }}
                    style={styles.equalProfileImage}
                  />
                  <Image
                    source={{ uri: match.participantImages[1] }}
                    style={[styles.equalProfileImage, styles.equalProfileOverlap]}
                  />
                </View>
              ) : (
                // For 3-4 players: Main image with smaller secondary images
                <View style={styles.mainProfileWrapper}>
                  <Image
                    source={{ uri: match.participantImages[0] }}
                    style={styles.mainProfileImage}
                  />
                  {/* Secondary profile pictures - smaller, half the size */}
                  {match.participantImages.slice(1, Math.min(4, match.participantCount)).map((image, index) => (
                    <Image
                      key={index}
                      source={{ uri: image }}
                      style={[
                        styles.secondaryProfileImage,
                        getSecondaryPosition(index, match.participantCount),
                      ]}
                    />
                  ))}
                </View>
              )
            ) : (
              <View style={styles.placeholderProfile}>
                <Ionicons name="person" size={24} color="#999" />
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
    backgroundColor: '#E8F8F5',
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
  // For 2 players: same size images side by side
  twoPlayersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  equalProfileImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  equalProfileOverlap: {
    marginLeft: -10, // Slight overlap
  },
  // For 3-4 players: main image with smaller secondaries
  mainProfileWrapper: {
    position: 'relative',
    width: 65,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  secondaryProfileImage: {
    position: 'absolute',
    width: 25, // Half the size of main (50/2)
    height: 25,
    borderRadius: 12.5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  secondaryTopSmall: {
    top: 0,
    right: -5,
  },
  secondaryRightSmall: {
    right: -5,
    top: '50%',
    marginTop: -12.5, // Half of image height
  },
  secondaryBottomSmall: {
    bottom: 0,
    right: -5,
  },
  placeholderProfile: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ageBadge: {
    backgroundColor: COLORS.primary,
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
