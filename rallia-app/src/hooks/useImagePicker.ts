import { useState } from 'react';
import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface ImagePickerResult {
  uri: string | null;
  error?: string;
}

/**
 * Custom hook for handling image selection with permissions
 * Supports both camera and gallery, with platform-specific handling
 */
export const useImagePicker = () => {
  const [image, setImage] = useState<string | null>(null);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    return {
      camera: cameraStatus === 'granted',
      library: libraryStatus === 'granted',
    };
  };

  const pickImageFromCamera = async (): Promise<ImagePickerResult> => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setImage(uri);
        return { uri };
      }
      
      return { uri: null };
    } catch (error) {
      console.error('Error picking image from camera:', error);
      return { uri: null, error: 'Failed to capture image' };
    }
  };

  const pickImageFromGallery = async (): Promise<ImagePickerResult> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setImage(uri);
        return { uri };
      }
      
      return { uri: null };
    } catch (error) {
      console.error('Error picking image from gallery:', error);
      return { uri: null, error: 'Failed to select image' };
    }
  };

  const pickImage = async () => {
    // Web: directly launch image picker
    if (Platform.OS === 'web') {
      return await pickImageFromGallery();
    }

    // Mobile: request permissions first
    const permissions = await requestPermissions();
    
    if (!permissions.camera && !permissions.library) {
      Alert.alert(
        'Permission Required',
        'Please grant camera and photo library permissions to upload a profile picture.',
        [{ text: 'OK' }]
      );
      return { uri: null, error: 'Permissions denied' };
    }

    // Show options dialog
    return new Promise<ImagePickerResult>((resolve) => {
      Alert.alert(
        'Select Profile Picture',
        'Choose an option',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              if (!permissions.camera) {
                Alert.alert('Permission Required', 'Camera permission is required to take a photo.');
                resolve({ uri: null, error: 'Camera permission denied' });
                return;
              }
              const result = await pickImageFromCamera();
              resolve(result);
            },
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              if (!permissions.library) {
                Alert.alert('Permission Required', 'Photo library permission is required to choose a photo.');
                resolve({ uri: null, error: 'Library permission denied' });
                return;
              }
              const result = await pickImageFromGallery();
              resolve(result);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve({ uri: null }),
          },
        ]
      );
    });
  };

  const clearImage = () => {
    setImage(null);
  };

  return {
    image,
    pickImage,
    clearImage,
    setImage, // Allow manual setting
  };
};
