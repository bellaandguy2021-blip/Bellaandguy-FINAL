// Uploads only happen from the admin/staff panel, whose login session lives in
// the supabaseAdmin client (storageKey bg_admin_session). Using the default
// client here sent uploads as anonymous → storage RLS rejected every upload.
import { supabaseAdmin as supabase } from "./supabaseAdmin";

const MAX_DIMENSION = 1600; // px — plenty for full-width hero/gallery use, keeps mobile downloads light
const JPEG_QUALITY = 0.82;

/**
 * Resizes an image client-side (canvas) before upload so large phone-camera
 * photos (often 3-8MB) don't ship to every visitor at full resolution — this
 * is what actually makes the site feel smooth on mobile/slow connections,
 * since next/image's server-side optimizer is disabled (see next.config.ts).
 * Falls back to the original file untouched if anything goes wrong (e.g. an
 * unsupported format) or if it's already small enough to skip compressing.
 */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 500_000) return file; // already small — not worth re-encoding

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file; // compression didn't actually help — keep original

    const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file; // any failure (unsupported codec, etc.) — just upload the original
  }
}

/** Compresses (when it helps) and uploads a single image to the given public Storage bucket, returning its public URL. */
export async function uploadImage(file: File, bucket: string): Promise<string> {
  const toUpload = await compressImage(file);
  const ext = toUpload.name.split(".").pop() || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, toUpload, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
