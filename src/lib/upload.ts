import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function validateImageFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) {
    return "Only JPEG, PNG, WebP, or GIF images are allowed";
  }
  if (file.size > MAX_BYTES) {
    return "Image must be under 5MB";
  }
  return null;
}

/** Upload to poll-images or avatars bucket. Returns public URL. */
export async function uploadImage(
  file: File,
  bucket: "poll-images" | "avatars",
  userId: string
): Promise<string> {
  const err = validateImageFile(file);
  if (err) throw new Error(err);

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}
