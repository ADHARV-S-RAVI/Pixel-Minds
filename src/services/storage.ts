import { supabase } from '../lib/supabase';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Validate image file type and size before upload
 */
export const validateOpportunityImageFile = (file: File): { valid: boolean; error?: string } => {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const fileType = file.type?.toLowerCase();
  const fileName = file.name?.toLowerCase();
  const hasValidExt = /\.(jpe?g|png|webp)$/i.test(fileName);
  const hasValidMime = ALLOWED_IMAGE_TYPES.includes(fileType);

  if (!hasValidMime && !hasValidExt) {
    return {
      valid: false,
      error: `Invalid file format for "${file.name}". Only JPEG, PNG, and WebP images are allowed.`
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
 * Upload an image file to Supabase Storage with bucket fallback
 * @param file The image file to upload
 * @param bucket Storage bucket name (defaults to 'opportunity-banners')
 * @param folder Subfolder within the bucket
 * @returns Public URL of the uploaded image
 */
export const uploadImage = async (
  file: File,
  bucket = 'opportunity-banners',
  folder = 'banners'
): Promise<string> => {
  const validation = validateOpportunityImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueId = Math.random().toString(36).substring(2, 8);
  const filePath = `${folder}/${Date.now()}_${uniqueId}_${cleanName}`;

  // Try primary bucket first, with fallback to alternate bucket name
  const candidateBuckets = bucket === 'opportunity-banners' 
    ? ['opportunity-banners', 'opportunities']
    : [bucket, 'opportunity-banners'];

  let lastError: any = null;

  for (const b of candidateBuckets) {
    try {
      const { data, error } = await supabase.storage
        .from(b)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
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
        // If bucket not found, try next candidate
        if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
          continue;
        }
      }
    } catch (candidateErr) {
      lastError = candidateErr;
    }
  }

  console.error('[uploadImage] Storage upload error across candidate buckets:', lastError?.message || lastError);
  throw new Error(`Upload failed: ${lastError?.message || 'Unable to store image. Please verify your connection.'}`);
};

/**
 * Remove an uploaded image from Supabase Storage by its public URL
 */
export const deleteStorageFile = async (publicUrl: string): Promise<boolean> => {
  if (!publicUrl) return false;

  try {
    // Extract bucket and path from URL
    // Format: .../storage/v1/object/public/<bucket>/<path>
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
 * Upload an opportunity cover/banner image
 */
export const uploadOpportunityImage = async (
  file: File,
  userId: string
): Promise<string> => {
  return uploadImage(file, 'opportunity-banners', `users/${userId}`);
};

/**
 * Parse opportunity images string safely.
 * Supports legacy single URL strings, JSON arrays, and comma-separated multiple URLs.
 */
export const parseOpportunityImages = (imageUrl?: string | null): string[] => {
  if (!imageUrl) return [];
  const trimmed = imageUrl.trim();
  if (!trimmed) return [];

  // Check if stored as JSON array string
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

  // Handle comma-separated URLs or single legacy URL
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

