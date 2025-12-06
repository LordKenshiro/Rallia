import React, { useState, useEffect, useCallback } from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useProfile } from '@rallia/shared-hooks';

interface ProfilePictureButtonProps {
  size?: number;
}

const ProfilePictureButton: React.FC<ProfilePictureButtonProps> = ({ size = 28 }) => {
  const navigation = useNavigation();
  const { profile, refetch } = useProfile();
  const [imageLoadError, setImageLoadError] = useState(false);

  const profilePictureUrl = profile?.profile_picture_url || null;

  useEffect(() => {
    if (profile) {
      setImageLoadError(false);
    }
  }, [profile, profilePictureUrl]);

  // Refetch profile when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handlePress = () => {
    (navigation as any).navigate('Profile');
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      {profilePictureUrl && !imageLoadError ? (
        <Image 
          source={{ uri: profilePictureUrl }} 
          style={[styles.profileImage, { width: size, height: size, borderRadius: size / 2 }]}
          onError={() => setImageLoadError(true)}
        />
      ) : (
        <Ionicons name="person-circle-outline" size={size} color="#333" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 4,
    marginLeft: 8,
  },
  profileImage: {
    backgroundColor: '#E0E0E0',
  },
});

export default ProfilePictureButton;
