/**
 * Backblaze B2 Video Upload Service
 *
 * Handles video uploads to Backblaze B2 Cloud Storage for cost-effective
 * storage of large video files (rating proof videos).
 *
 * SETUP REQUIREMENTS (TODOs):
 * ===========================
 *
 * 1. Create a Backblaze B2 Account:
 *    - Go to https://www.backblaze.com/b2/cloud-storage.html
 *    - Sign up for an account (10GB free storage included)
 *
 * 2. Create a B2 Bucket:
 *    - In the B2 Console, go to "Buckets" and click "Create a Bucket"
 *    - Bucket Name: "rallia-videos" (or your preferred name)
 *    - Bucket Type: "Public" (for video playback) or "Private" with signed URLs
 *    - Enable encryption if required
 *    - Note the bucket ID for configuration
 *
 * 3. Create Application Keys:
 *    - Go to "App Keys" in B2 Console
 *    - Click "Add a New Application Key"
 *    - Name: "rallia-mobile-uploads"
 *    - Bucket access: Select your bucket or "All"
 *    - Type of access: "Read and Write"
 *    - IMPORTANT: Copy the keyID and applicationKey immediately (shown only once)
 *
 * 4. Configure CORS for Direct Uploads:
 *    - Go to your bucket settings
 *    - Add CORS rules to allow uploads from mobile devices:
 *    [
 *      {
 *        "corsRuleName": "mobileUploads",
 *        "allowedOrigins": ["*"],
 *        "allowedHeaders": ["*"],
 *        "allowedOperations": ["b2_upload_file", "b2_download_file_by_name"],
 *        "maxAgeSeconds": 3600
 *      }
 *    ]
 *
 * 5. Set Environment Variables:
 *    Add these to your .env file:
 *    - EXPO_PUBLIC_BACKBLAZE_KEY_ID=your_key_id
 *    - EXPO_PUBLIC_BACKBLAZE_APP_KEY=your_application_key
 *    - EXPO_PUBLIC_BACKBLAZE_BUCKET_ID=your_bucket_id
 *    - EXPO_PUBLIC_BACKBLAZE_BUCKET_NAME=rallia-videos
 *
 * 6. (Optional) Set up Lifecycle Rules:
 *    - Configure auto-deletion of incomplete uploads after 24 hours
 *    - Set up video retention policies if needed
 *
 * 7. (Optional) Configure CDN/Cloudflare:
 *    - For better video delivery performance, consider using Cloudflare
 *      as a CDN in front of Backblaze B2 (free bandwidth alliance)
 */

import { Logger } from '@rallia/shared-services';
import { Platform } from 'react-native';

// Types
export interface BackblazeUploadResult {
  fileId: string;
  fileName: string;
  url: string;
  size: number;
  contentType: string;
  error?: Error;
}

export interface BackblazeAuthResponse {
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
  allowed: {
    bucketId: string;
    bucketName: string;
    capabilities: string[];
  };
}

export interface BackblazeUploadUrlResponse {
  bucketId: string;
  uploadUrl: string;
  authorizationToken: string;
}

export interface BackblazeUploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
}

// Configuration from environment
const BACKBLAZE_KEY_ID = process.env.EXPO_PUBLIC_BACKBLAZE_KEY_ID || '';
const BACKBLAZE_APP_KEY = process.env.EXPO_PUBLIC_BACKBLAZE_APP_KEY || '';
const BACKBLAZE_BUCKET_ID = process.env.EXPO_PUBLIC_BACKBLAZE_BUCKET_ID || '';
const BACKBLAZE_BUCKET_NAME = process.env.EXPO_PUBLIC_BACKBLAZE_BUCKET_NAME || 'rallia-videos';
const BACKBLAZE_AUTH_URL = 'https://api.backblazeb2.com/b2api/v2/b2_authorize_account';

// Cache auth token (valid for 24 hours, we'll refresh every 12 hours to be safe)
let cachedAuth: BackblazeAuthResponse | null = null;
let authExpiresAt: number = 0;

/**
 * Check if Backblaze B2 is configured
 */
export function isBackblazeConfigured(): boolean {
  return Boolean(BACKBLAZE_KEY_ID && BACKBLAZE_APP_KEY && BACKBLAZE_BUCKET_ID);
}

/**
 * Get Backblaze configuration status for debugging
 */
export function getBackblazeConfigStatus(): {
  configured: boolean;
  hasKeyId: boolean;
  hasAppKey: boolean;
  hasBucketId: boolean;
  bucketName: string;
} {
  return {
    configured: isBackblazeConfigured(),
    hasKeyId: Boolean(BACKBLAZE_KEY_ID),
    hasAppKey: Boolean(BACKBLAZE_APP_KEY),
    hasBucketId: Boolean(BACKBLAZE_BUCKET_ID),
    bucketName: BACKBLAZE_BUCKET_NAME,
  };
}

/**
 * Authenticate with Backblaze B2 API
 * Caches the token for 12 hours
 */
async function authenticateB2(): Promise<BackblazeAuthResponse> {
  // Return cached auth if still valid
  if (cachedAuth && Date.now() < authExpiresAt) {
    return cachedAuth;
  }

  if (!isBackblazeConfigured()) {
    throw new Error('Backblaze B2 is not configured. Please set up environment variables.');
  }

  try {
    const credentials = Buffer.from(`${BACKBLAZE_KEY_ID}:${BACKBLAZE_APP_KEY}`).toString('base64');

    const response = await fetch(BACKBLAZE_AUTH_URL, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      Logger.error('Backblaze B2 auth failed', new Error(errorText), {
        status: response.status,
      });
      throw new Error(`Backblaze auth failed: ${response.status}`);
    }

    const data = await response.json();

    cachedAuth = {
      authorizationToken: data.authorizationToken,
      apiUrl: data.apiUrl,
      downloadUrl: data.downloadUrl,
      allowed: data.allowed,
    };

    // Set expiry to 12 hours from now (token is valid for 24 hours)
    authExpiresAt = Date.now() + 12 * 60 * 60 * 1000;

    Logger.debug('Backblaze B2 authenticated successfully', {
      apiUrl: cachedAuth.apiUrl,
      bucketName: data.allowed?.bucketName,
    });

    return cachedAuth;
  } catch (error) {
    Logger.error('Backblaze B2 authentication error', error as Error);
    throw error;
  }
}

/**
 * Get upload URL from Backblaze B2
 */
async function getUploadUrl(): Promise<BackblazeUploadUrlResponse> {
  const auth = await authenticateB2();

  const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      Authorization: auth.authorizationToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucketId: BACKBLAZE_BUCKET_ID,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    Logger.error('Failed to get B2 upload URL', new Error(errorText));
    throw new Error(`Failed to get upload URL: ${response.status}`);
  }

  return response.json();
}

/**
 * Generate a unique file name for uploads
 */
function generateFileName(userId: string, originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = originalName.split('.').pop()?.toLowerCase() || 'mp4';

  // Organize by userId for easy management
  return `rating-proofs/${userId}/${timestamp}-${random}.${ext}`;
}

/**
 * Get content type from file extension
 */
function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    '3gp': 'video/3gpp',
    m4v: 'video/x-m4v',
  };
  return mimeTypes[ext || ''] || 'video/mp4';
}

/**
 * Upload video to Backblaze B2
 *
 * @param videoUri - Local file URI from video picker/recorder
 * @param userId - User ID for organizing files
 * @param originalName - Original filename for extension detection
 * @param onProgress - Progress callback (percentage)
 * @returns Upload result with file URL
 */
export async function uploadVideoToBackblaze(
  videoUri: string,
  userId: string,
  originalName: string = 'video.mp4',
  onProgress?: (progress: BackblazeUploadProgress) => void
): Promise<BackblazeUploadResult> {
  if (!isBackblazeConfigured()) {
    Logger.warn('Backblaze B2 not configured, cannot upload video');
    throw new Error('Video upload service is not configured');
  }

  try {
    Logger.info('Starting Backblaze B2 video upload', {
      userId,
      originalName,
      platform: Platform.OS,
    });

    // Get upload URL
    const uploadUrlData = await getUploadUrl();
    const auth = await authenticateB2();

    // Generate unique file name
    const fileName = generateFileName(userId, originalName);
    const contentType = getContentType(originalName);

    // Read the video file
    const response = await fetch(videoUri);
    const blob = await response.blob();
    const fileSize = blob.size;

    Logger.debug('Video file loaded', {
      size: fileSize,
      contentType,
      fileName,
    });

    // Report initial progress
    onProgress?.({
      bytesUploaded: 0,
      totalBytes: fileSize,
      percentage: 0,
    });

    // Convert blob to ArrayBuffer for upload
    const arrayBuffer = await blob.arrayBuffer();

    // Calculate SHA1 hash for integrity verification
    // Note: In production, you might want to use a native module for this
    const sha1Hash = await calculateSHA1(arrayBuffer);

    // Upload to Backblaze B2
    const uploadResponse = await fetch(uploadUrlData.uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: uploadUrlData.authorizationToken,
        'X-Bz-File-Name': encodeURIComponent(fileName),
        'Content-Type': contentType,
        'Content-Length': fileSize.toString(),
        'X-Bz-Content-Sha1': sha1Hash,
        'X-Bz-Info-src_last_modified_millis': Date.now().toString(),
      },
      body: arrayBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      Logger.error('Backblaze B2 upload failed', new Error(errorText), {
        status: uploadResponse.status,
        fileName,
      });
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();

    // Report completion
    onProgress?.({
      bytesUploaded: fileSize,
      totalBytes: fileSize,
      percentage: 100,
    });

    // Construct the public download URL
    const publicUrl = `${auth.downloadUrl}/file/${BACKBLAZE_BUCKET_NAME}/${fileName}`;

    Logger.info('Backblaze B2 upload completed successfully', {
      fileId: uploadResult.fileId,
      fileName,
      url: publicUrl,
      size: fileSize,
    });

    return {
      fileId: uploadResult.fileId,
      fileName: fileName,
      url: publicUrl,
      size: fileSize,
      contentType,
    };
  } catch (error) {
    Logger.error('Backblaze B2 upload error', error as Error, {
      userId,
      videoUri: videoUri.substring(0, 50),
    });
    return {
      fileId: '',
      fileName: '',
      url: '',
      size: 0,
      contentType: '',
      error: error as Error,
    };
  }
}

/**
 * Delete video from Backblaze B2
 */
export async function deleteVideoFromBackblaze(fileId: string, fileName: string): Promise<boolean> {
  try {
    const auth = await authenticateB2();

    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_delete_file_version`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        fileName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      Logger.error('Failed to delete B2 file', new Error(errorText), {
        fileId,
        fileName,
      });
      return false;
    }

    Logger.info('Backblaze B2 file deleted successfully', { fileId, fileName });
    return true;
  } catch (error) {
    Logger.error('Backblaze B2 delete error', error as Error, { fileId, fileName });
    return false;
  }
}

/**
 * Calculate SHA1 hash of an ArrayBuffer
 * Uses SubtleCrypto when available, fallback to simple checksum
 */
async function calculateSHA1(buffer: ArrayBuffer): Promise<string> {
  try {
    // Try using SubtleCrypto (available in some RN environments)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // SubtleCrypto not available
  }

  // Fallback: Use 'do_not_verify' to skip SHA1 check
  // In production, consider using a native module like react-native-hash
  return 'do_not_verify';
}

/**
 * Get video thumbnail URL (Backblaze doesn't auto-generate,
 * this is a placeholder for future implementation)
 */
export function getVideoThumbnailUrl(_videoUrl: string): string | null {
  // TODO: Implement video thumbnail generation
  // Options:
  // 1. Use a Supabase Edge Function to generate thumbnails
  // 2. Use a third-party service like Cloudinary
  // 3. Generate client-side and upload separately
  return null;
}
