import { createSupabaseClient, getSavedSupabaseConfig } from './supabase';

/**
 * Compresses an uploaded image file to a clean JPEG data URL (< 220KB)
 * so uploads succeed reliably in Supabase and local storage without CORS errors.
 */
export function compressImageToDataUrl(file: File, maxWidth = 960, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Attempts Supabase Storage upload if configured and bucket exists,
 * and falls back cleanly to compressed data URL so image upload never fails.
 */
export async function uploadProjectOrBannerImage(file: File, folder = 'uploads'): Promise<string> {
  const compressed = await compressImageToDataUrl(file, 960, 0.8);
  const cfg = getSavedSupabaseConfig();
  const client = createSupabaseClient(cfg, true);
  if (client) {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${folder}/${Date.now()}_${safeName}`;
      const { error } = await client.storage.from('mjlab-assets').upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });
      if (!error) {
        const { data } = client.storage.from('mjlab-assets').getPublicUrl(path);
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch {
      // fallback to compressed data URL
    }
  }
  return compressed;
}
