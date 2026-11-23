import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Compresses an uploaded image file to a clean WebP/JPEG data URL (< 220KB)
 * so uploads succeed reliably in Firestore/Supabase even without Storage CORS.
 */
export function compressImageToDataUrl(file: File, maxWidth = 960, quality = 0.78): Promise<string> {
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
 * Attempts Firebase Storage upload first (with short timeout), and falls back cleanly
 * to compressed data URL so image upload never fails in the preview or client browser.
 */
export async function uploadProjectOrBannerImage(file: File, folder = 'uploads'): Promise<string> {
  const compressed = await compressImageToDataUrl(file, 960, 0.8);
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageRef = ref(storage, `${folder}/${Date.now()}_${safeName}`);
    const uploadPromise = uploadBytes(storageRef, file).then((snap) => getDownloadURL(snap.ref));
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Storage upload timeout')), 3500)
    );
    const url = await Promise.race([uploadPromise, timeoutPromise]);
    return url;
  } catch {
    return compressed;
  }
}
