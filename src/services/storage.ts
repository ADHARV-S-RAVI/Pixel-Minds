import { supabase } from '../lib/supabase';

/**
 * Upload an image file to Supabase Storage
 * @param file The image file to upload
 * @param bucket Storage bucket name (defaults to 'opportunities')
 * @param folder Subfolder within the bucket
 * @returns Public URL of the uploaded image
 */
export const uploadImage = async (
  file: File,
  bucket = 'opportunities',
  folder = 'banners'
): Promise<string> => {
  if (!file) {
    throw new Error('No image file selected.');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be a valid image (JPG, PNG, WebP, etc.).');
  }

  // Max 5MB file size
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('Image size must be less than 5MB.');
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueId = Math.random().toString(36).substring(2, 8);
  const filePath = `${folder}/${Date.now()}_${uniqueId}_${cleanName}`;

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (error) {
      console.error('[uploadImage] Supabase Storage upload error:', error.message);
      throw new Error(`Upload failed: ${error.message}`);
    }

    if (!data?.path) {
      throw new Error('Upload succeeded but file path was not returned.');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to retrieve public URL for uploaded image.');
    }

    return urlData.publicUrl;
  } catch (err: any) {
    console.error('[uploadImage] Exception during upload:', err);
    throw new Error(err.message || 'Image upload failed. Please check your connection or provide a direct image URL.');
  }
};

/**
 * Upload an opportunity cover/banner image
 */
export const uploadOpportunityImage = async (
  file: File,
  userId: string
): Promise<string> => {
  return uploadImage(file, 'opportunities', `users/${userId}`);
};
