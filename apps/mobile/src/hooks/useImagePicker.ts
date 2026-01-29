import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Logger } from '@rallia/shared-services';
import { useTranslation } from './useTranslation';

export interface ImagePickerResult {
  uri: string | null;
  error?: string;
}

export interface ImagePickerPermissions {
  camera: boolean;
  library: boolean;
}

/**
 * Custom hook for handling image selection with permissions
 * Supports both camera and gallery, with platform-specific handling
 *
 * Now supports a custom UI sheet via showPicker state and action callbacks.
 * Components can use:
 * - showPicker / setShowPicker: to control sheet visibility
 * - pickFromCamera / pickFromGallery: to trigger the actual selection
 * - permissions: to conditionally disable camera/gallery options
 */
export const useImagePicker = () => {
  const [image, setImage] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [permissions, setPermissions] = useState<ImagePickerPermissions>({
    camera: false,
    library: false,
  });
  const { t } = useTranslation();

  const requestPermissions = useCallback(async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    const perms = {
      camera: cameraStatus === 'granted',
      library: libraryStatus === 'granted',
    };
    setPermissions(perms);
    return perms;
  }, []);

  const pickFromCamera = useCallback(async (): Promise<ImagePickerResult> => {
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
  }, []);

  const pickFromGallery = useCallback(async (): Promise<ImagePickerResult> => {
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
  }, []);

  /**
   * Opens the image picker sheet (custom UI)
   * Call this to show the ImagePickerSheet component
   */
  const openPicker = useCallback(async () => {
    // Web: directly launch image picker (no sheet needed)
    if (Platform.OS === 'web') {
      return await pickFromGallery();
    }

    // Mobile: request permissions and show sheet
    const perms = await requestPermissions();

    if (!perms.camera && !perms.library) {
      Alert.alert(t('alerts.error'), t('errors.permissionsDenied'), [{ text: t('common.ok') }]);
      return { uri: null, error: t('errors.permissionsDenied') };
    }

    // Show the custom picker sheet
    setShowPicker(true);
    return { uri: null }; // Actual result will come from pickFromCamera/pickFromGallery
  }, [requestPermissions, pickFromGallery, t]);

  /**
   * Legacy pickImage function that uses native Alert
   * @deprecated Use openPicker() with ImagePickerSheet component instead
   */
  const pickImage = useCallback(async () => {
    // Web: directly launch image picker
    if (Platform.OS === 'web') {
      return await pickFromGallery();
    }

    // Mobile: request permissions first
    const perms = await requestPermissions();

    if (!perms.camera && !perms.library) {
      Alert.alert(t('alerts.error'), t('errors.permissionsDenied'), [{ text: t('common.ok') }]);
      return { uri: null, error: t('errors.permissionsDenied') };
    }

    // Show options dialog (legacy native Alert)
    return new Promise<ImagePickerResult>(resolve => {
      Alert.alert(t('profile.profilePicture'), t('common.select'), [
        {
          text: t('profile.changePhoto'),
          onPress: async () => {
            if (!perms.camera) {
              Alert.alert(t('alerts.error'), t('errors.permissionsDenied'));
              resolve({ uri: null, error: t('errors.permissionsDenied') });
              return;
            }
            const result = await pickFromCamera();
            resolve(result);
          },
        },
        {
          text: t('common.select'),
          onPress: async () => {
            if (!perms.library) {
              Alert.alert(t('alerts.error'), t('errors.permissionsDenied'));
              resolve({ uri: null, error: t('errors.permissionsDenied') });
              return;
            }
            const result = await pickFromGallery();
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
  }, [requestPermissions, pickFromCamera, pickFromGallery, t]);

  const clearImage = useCallback(() => {
    setImage(null);
  }, []);

  const closePicker = useCallback(() => {
    setShowPicker(false);
  }, []);

  return {
    image,
    // Legacy API (still works, uses native Alert)
    pickImage,
    // New API (custom UI sheet)
    showPicker,
    openPicker,
    closePicker,
    pickFromCamera,
    pickFromGallery,
    permissions,
    // Utility
    clearImage,
    setImage, // Allow manual setting
  };
};
