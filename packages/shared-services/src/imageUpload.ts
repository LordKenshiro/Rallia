import { supabase } from './supabase';
import { Platform } from 'react-native';

export interface UploadResult {
  url: string | null;
  error: Error | null;
}

/**
 * Uploads an image to Supabase Storage and returns the public URL
 * 
 * @param imageUri - Local file URI from image picker (file:///, content:///, data:, etc.)
 * @param bucket - Storage bucket name (default: 'profile-pictures')
 * @param userId - User ID for organizing files
 * @returns Public URL of uploaded image or null if failed
 * 
 * @example
 * const { url, error } = await uploadImage(imageUri, 'profile-pictures', userId);
 * if (url) {
 *   // Save URL to database
 *   await supabase.from('profile').update({ profile_picture_url: url });
 * }
 */
export async function uploadImage(
  imageUri: string,
  bucket: string = 'profile-pictures',
  userId?: string
): Promise<UploadResult> {
  try {
    // If no userId provided, get from auth
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { url: null, error: new Error('User not authenticated') };
      }
      userId = user.id;
    }

    // Create unique filename
    const fileExt = imageUri.split('.').pop()?.split('?')[0] || 'jpg';
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Convert image to uploadable format based on platform
    let fileData: Blob;
    
    if (Platform.OS === 'web') {
      // Web: Convert data URI or blob URL to blob
      const response = await fetch(imageUri);
      fileData = await response.blob();
    } else {
      // Mobile: Fetch the image as blob
      const response = await fetch(imageUri);
      fileData = await response.blob();
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileData, {
        contentType: `image/${fileExt}`,
        upsert: false, // Create new file each time
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { url: null, error: error as Error };
  }
}

/**
 * Deletes an image from Supabase Storage
 * 
 * @param imageUrl - Public URL or file path of the image to delete
 * @param bucket - Storage bucket name (default: 'profile-pictures')
 * @returns Success boolean
 */
export async function deleteImage(
  imageUrl: string,
  bucket: string = 'profile-pictures'
): Promise<boolean> {
  try {
    // Extract file path from public URL
    const urlParts = imageUrl.split('/');
    const filePath = urlParts[urlParts.length - 1];

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}
