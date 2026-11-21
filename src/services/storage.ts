import { supabase } from '../lib/supabase';
import { logFailedUpload } from './securityLogger';

// Bucket-aligned MIME type lists.
// opportunity-banners bucket does NOT allow image/gif (bucket policy: jpeg/png/webp only).
// post-images and avatars buckets allow image/gif.
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_BANNER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Validate image file signature (magic numbers) to prevent extension spoofing
 */
export const validateImageMagicBytes = async (file: File): Promise<boolean> => {
  try {
    const slice = file.slice(0, 12);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (bytes.length < 4) return false;

    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return true;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return true;
    }

    // GIF: 47 49 46 38
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      return true;
    }

    // WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes.length >= 12) {
      if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
        return true;
      }
    }

    return false;
  } catch {
    // If arrayBuffer reading fails, return false as safe default
    return false;
  }
};

/**
 * Sanitize filename to prevent directory traversal and null-byte injection
 */
export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[/\\]+/g, '_') // replace path separators with underscore
    .replace(/\.\.+/g, '_') // remove path traversal dots
    .replace(/[^\w.-]/g, '_') // allow only alphanumeric, underscores, dots, hyphens
    .replace(/^_+|_+$/g, '') // trim leading/trailing underscores
    .substring(0, 100);
};

/**
 * Validate image file type, size, and magic bytes before upload.
 * Pass allowedTypes to enforce bucket-specific MIME restrictions.
 */
export const validateOpportunityImageFile = (
  file: File,
  allowedTypes: string[] = ALLOWED_IMAGE_TYPES
): { valid: boolean; error?: string } => {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const fileType = file.type?.toLowerCase();
  const fileName = file.name?.toLowerCase();

  // Reject SVG, HTML, or executable extensions
  if (/\.(svg|html?|php|js|jsx|ts|tsx|exe|sh|bat|cmd)$/i.test(fileName)) {
    return {
      valid: false,
      error: 'Dangerous file type detected. Only JPEG, PNG, WebP, and GIF images are allowed.'
    };
  }

  const allowsGif = allowedTypes.includes('image/gif');
  const validExtRegex = allowsGif ? /\.(jpe?g|png|webp|gif)$/i : /\.(jpe?g|png|webp)$/i;
  const hasValidExt = validExtRegex.test(fileName);
  const hasValidMime = allowedTypes.includes(fileType);

  if (!hasValidMime || !hasValidExt) {
    const allowedMsg = allowsGif ? 'JPEG, PNG, WebP, and GIF' : 'JPEG, PNG, and WebP';
    return {
      valid: false,
      error: `Invalid file format for "${file.name}". Only ${allowedMsg} images are allowed.`
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `"${file.name}" is ${sizeInMb} MB. Maximum allowed image size is 2 MB.`
    };
  }

  return { valid: true };
};

/**
 * Upload an image file to Supabase Storage.
 * userId is REQUIRED for banner and post-image buckets so the file is placed
 * inside the caller's owned namespace (banners/<userId>/... or posts/<userId>/...).
 * This matches the symmetric Phase 3 storage RLS policies.
 */
export const uploadImage = async (
  file: File,
  bucket = 'opportunity-banners',
  folder = 'banners',
  userId?: string
): Promise<string> => {
  // For banner bucket, reject GIFs at the frontend to match bucket MIME policy
  const isBannerBucket = bucket === 'opportunity-banners';
  const allowedTypes = isBannerBucket ? ALLOWED_BANNER_TYPES : ALLOWED_IMAGE_TYPES;

  if (isBannerBucket && file.type?.toLowerCase() === 'image/gif') {
    const err = 'GIF images are not allowed for opportunity banners. Please use JPEG, PNG, or WebP.';
    logFailedUpload(userId, file?.name || 'unknown', err);
    throw new Error(err);
  }

  const validation = validateOpportunityImageFile(file);
  if (!validation.valid) {
    // Re-validate against bucket-specific allowed types
    const fileType = file.type?.toLowerCase();
    if (!allowedTypes.includes(fileType)) {
      const typeErr = `File type "${fileType}" is not allowed for this upload. Allowed: ${allowedTypes.join(', ')}.`;
      logFailedUpload(userId, file?.name || 'unknown', typeErr);
      throw new Error(typeErr);
    }
    logFailedUpload(userId, file?.name || 'unknown', validation.error || 'Validation failed');
    throw new Error(validation.error);
  }

  // Deep inspection of magic bytes
  const isRealImage = await validateImageMagicBytes(file);
  if (!isRealImage) {
    const err = 'File contents do not match a valid image format. Upload rejected for security.';
    logFailedUpload(userId, file.name, err);
    throw new Error(err);
  }

  const cleanName = sanitizeFileName(file.name);
  // Build the storage path: always include userId as the ownership segment
  // so it matches the symmetric Phase 3 RLS policies:
  //   post-images  → posts/<userId>/...
  //   opportunity-banners → banners/<userId>/...
  const safeFolder = folder.replace(/[/\\]+/g, '/').replace(/^\/+|\/+$/g, '');
  const uniqueId = Math.random().toString(36).substring(2, 8);

  let effectiveUserId = userId;
  if (!effectiveUserId) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      effectiveUserId = authData?.user?.id;
    } catch {
      // ignore
    }
  }

  // If userId is provided and the folder doesn't already end with it, append it
  // so uploads always land in the owned sub-namespace.
  let resolvedFolder = safeFolder;
  if (effectiveUserId) {
    const folderParts = safeFolder.split('/');
    const lastPart = folderParts[folderParts.length - 1];
    if (lastPart !== effectiveUserId) {
      resolvedFolder = `${safeFolder}/${effectiveUserId}`;
    }
  }

  const filePath = `${resolvedFolder}/${Date.now()}_${uniqueId}_${cleanName}`;

  // For banner bucket, only try the canonical bucket (no silent fallback to 'opportunities'
  // since that bucket may have different ownership policies).
  const candidateBuckets = isBannerBucket
    ? ['opportunity-banners']
    : [bucket];

  let lastError: any = null;

  for (const b of candidateBuckets) {
    try {
      const { data, error } = await supabase.storage
        .from(b)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'image/jpeg'
        });

      if (!error && data?.path) {
        const { data: urlData } = supabase.storage
          .from(b)
          .getPublicUrl(data.path);

        if (urlData?.publicUrl) {
          return urlData.publicUrl;
        }
      }

      if (error) {
        lastError = error;
        if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
          continue;
        }
      }
    } catch (candidateErr) {
      lastError = candidateErr;
    }
  }

  logFailedUpload(userId, file.name, lastError?.message || 'Storage upload error');
  console.error('[uploadImage] Storage upload error across candidate buckets:', lastError?.message || lastError);
  throw new Error(`Upload failed: ${lastError?.message || 'Unable to store image. Please verify your connection.'}`);
};

/**
 * Upload a community post image with user ownership isolation.
 * Path: posts/<userId>/<timestamp>_<id>_<filename>
 * Matches Phase 3 RLS: foldername[1]='posts' AND foldername[2]=auth.uid()
 */
export const uploadPostImage = async (
  file: File,
  userId?: string
): Promise<string> => {
  let effectiveUserId = userId;
  if (!effectiveUserId) {
    const { data: authData } = await supabase.auth.getUser();
    effectiveUserId = authData?.user?.id;
  }
  if (!effectiveUserId) {
    throw new Error('Authentication required to upload post images.');
  }
  // Pass userId explicitly so uploadImage builds the correct owned path.
  return uploadImage(file, 'post-images', 'posts', effectiveUserId);
};

/**
 * Remove an uploaded image from Supabase Storage by its public URL
 */
export const deleteStorageFile = async (publicUrl: string): Promise<boolean> => {
  if (!publicUrl) return false;

  try {
    const urlObj = new URL(publicUrl);
    const parts = urlObj.pathname.split('/storage/v1/object/public/');
    if (parts.length < 2) return false;

    const remaining = parts[1];
    const slashIdx = remaining.indexOf('/');
    if (slashIdx === -1) return false;

    const bucket = remaining.substring(0, slashIdx);
    const filePath = decodeURIComponent(remaining.substring(slashIdx + 1));

    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) {
      console.warn('[deleteStorageFile] Remove note:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[deleteStorageFile] Exception:', err);
    return false;
  }
};

/**
 * Upload an opportunity cover/banner image with user folder isolation.
 * Path: banners/<userId>/<timestamp>_<id>_<filename>
 * Matches Phase 3 RLS: foldername[1]='banners' AND foldername[2]=auth.uid()
 * Note: GIFs are rejected at both the frontend and the bucket level.
 */
export const uploadOpportunityImage = async (
  file: File,
  userId?: string
): Promise<string> => {
  let effectiveUserId = userId;
  if (!effectiveUserId) {
    const { data: authData } = await supabase.auth.getUser();
    effectiveUserId = authData?.user?.id;
  }
  if (!effectiveUserId) {
    throw new Error('Authentication required to upload banner.');
  }
  // Pass userId explicitly; uploadImage will build banners/<userId>/...
  return uploadImage(file, 'opportunity-banners', 'banners', effectiveUserId);
};

/**
 * Upload an avatar image with user folder isolation.
 * Path: <userId>/<timestamp>_<id>_<filename>
 * Matches Phase 3 RLS: foldername[1]=auth.uid()
 */
export const uploadAvatar = async (
  file: File,
  userId?: string
): Promise<string> => {
  let effectiveUserId = userId;
  if (!effectiveUserId) {
    const { data: authData } = await supabase.auth.getUser();
    effectiveUserId = authData?.user?.id;
  }
  if (!effectiveUserId) {
    throw new Error('Authentication required to upload avatar.');
  }
  return uploadImage(file, 'avatars', effectiveUserId, effectiveUserId);
};

/**
 * Parse opportunity images string safely.
 * Supports legacy single URL strings, JSON arrays, and comma-separated multiple URLs.
 */
export const parseOpportunityImages = (imageUrl?: string | null): string[] => {
  if (!imageUrl) return [];
  const trimmed = imageUrl.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
          .map((u) => u.trim());
      }
    } catch {}
  }

  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

/**
 * Get the primary image URL for an opportunity.
 * Returns the first valid image, or empty string if none.
 */
export const getPrimaryImageUrl = (imageUrl?: string | null): string => {
  const images = parseOpportunityImages(imageUrl);
  return images[0] || '';
};
