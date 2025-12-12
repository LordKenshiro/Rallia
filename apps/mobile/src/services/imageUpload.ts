import { supabase, Logger } from '@rallia/shared-services';

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
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) {
        Logger.error('Auth error getting user for image upload', authError);
        return { url: null, error: new Error(`Auth error: ${authError.message}`) };
      }
      if (!user) {
        Logger.warn('No user session found for image upload');
        return { url: null, error: new Error('User not authenticated - no active session') };
      }
      userId = user.id;
      Logger.debug('Got user ID for image upload', { userId });
    }

    // Create unique filename
    const fileExt = imageUri.split('.').pop()?.split('?')[0] || 'jpg';
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

    let uploadData: ArrayBuffer | Blob;

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      // Web: Convert data URI or blob URL to blob
      const response = await fetch(imageUri);
      uploadData = await response.blob();
    } else {
      // React Native: Use XMLHttpRequest to get the file as a blob, then use FileReader to convert to ArrayBuffer
      Logger.debug('Reading image file for upload', {
        imageUri: imageUri.substring(0, 50) + '...',
      });
      uploadData = await new Promise<ArrayBuffer>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
          try {
            const blob = xhr.response as Blob;
            Logger.debug('Got blob from XHR', { blobSize: blob.size, blobType: blob.type });

            // Use FileReader to convert blob to ArrayBuffer (more reliable in RN)
            const reader = new FileReader();
            reader.onloadend = () => {
              if (reader.result instanceof ArrayBuffer) {
                Logger.debug('FileReader converted to ArrayBuffer', {
                  size: reader.result.byteLength,
                });
                resolve(reader.result);
              } else {
                reject(new Error('FileReader did not return ArrayBuffer'));
              }
            };
            reader.onerror = () => reject(new Error('FileReader error'));
            reader.readAsArrayBuffer(blob);
          } catch (e) {
            Logger.error('Error processing blob', e as Error);
            reject(e);
          }
        };
        xhr.onerror = () => {
          Logger.error('XHR error loading image', new Error('XHR failed'));
          reject(new Error('Failed to load image file'));
        };
        xhr.responseType = 'blob';
        xhr.open('GET', imageUri, true);
        xhr.send(null);
      });
    }

    // Upload to Supabase Storage
    Logger.debug('Uploading image to Supabase Storage', { bucket, filePath, contentType, userId });
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, uploadData, {
        contentType,
        upsert: false, // Create new file each time
      });

    if (uploadError) {
      Logger.error('Supabase Storage upload error', uploadError, { bucket, filePath, userId });
      throw uploadError;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    Logger.info('Image uploaded successfully', { publicUrl, userId });
    return { url: publicUrl, error: null };
  } catch (error) {
    Logger.error('Error uploading image', error as Error, { bucket, userId });
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

    const { error } = await supabase.storage.from(bucket).remove([filePath]);

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
