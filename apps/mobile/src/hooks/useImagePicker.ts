import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SheetManager } from 'react-native-actions-sheet';
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
 * Uses SheetManager to show the globally registered ImagePickerSheet.
 * Components can use:
 * - openPicker(): to show the image picker sheet
 * - pickFromCamera / pickFromGallery: to trigger selection directly
 * - image: the selected image URI
 */
export interface UseImagePickerOptions {
  title?: string;
  cameraLabel?: string;
  galleryLabel?: string;
}

export const useImagePicker = (options?: UseImagePickerOptions) => {
  const [image, setImage] = useState<string | null>(null);
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
   * Uses SheetManager to show the globally registered ImagePickerSheet
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

    // Show the image picker sheet via SheetManager
    SheetManager.show('image-picker', {
      payload: {
        onTakePhoto: pickFromCamera,
        onChooseFromGallery: pickFromGallery,
        title: options?.title,
        cameraLabel: options?.cameraLabel,
        galleryLabel: options?.galleryLabel,
        cameraDisabled: !perms.camera,
        galleryDisabled: !perms.library,
      },
    });

    return { uri: null }; // Actual result will come from pickFromCamera/pickFromGallery
  }, [requestPermissions, pickFromGallery, pickFromCamera, t, options]);

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

  return {
    image,
    // Legacy API (still works, uses native Alert)
    pickImage,
    // New API (uses SheetManager)
    openPicker,
    pickFromCamera,
    pickFromGallery,
    permissions,
    // Utility
    clearImage,
    setImage, // Allow manual setting
  };
};
