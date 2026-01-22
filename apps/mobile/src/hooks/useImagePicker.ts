import { useState } from 'react';
import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Logger } from '@rallia/shared-services';
import { useTranslation } from './useTranslation';

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
  const { t } = useTranslation();

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
      Logger.error('Failed to pick image from camera', error as Error, { source: 'camera' });
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
      Logger.error('Failed to pick image from gallery', error as Error, { source: 'gallery' });
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
      Alert.alert(t('alerts.error'), t('errors.permissionsDenied'), [{ text: t('common.ok') }]);
      return { uri: null, error: t('errors.permissionsDenied') };
    }

    // Show options dialog
    return new Promise<ImagePickerResult>(resolve => {
      Alert.alert(t('profile.profilePicture'), t('common.select'), [
        {
          text: t('profile.changePhoto'),
          onPress: async () => {
            if (!permissions.camera) {
              Alert.alert(t('alerts.error'), t('errors.permissionsDenied'));
              resolve({ uri: null, error: t('errors.permissionsDenied') });
              return;
            }
            const result = await pickImageFromCamera();
            resolve(result);
          },
        },
        {
          text: t('common.select'),
          onPress: async () => {
            if (!permissions.library) {
              Alert.alert(t('alerts.error'), t('errors.permissionsDenied'));
              resolve({ uri: null, error: t('errors.permissionsDenied') });
              return;
            }
            const result = await pickImageFromGallery();
            resolve(result);
          },
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
          onPress: () => resolve({ uri: null }),
        },
      ]);
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
