"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  POST_IMAGE_MAX_BYTES,
  POST_IMAGE_TYPES,
  POST_MAX_CHARS,
} from "@/types/content";
import { Loader2, ImagePlus } from "lucide-react";

export default function CreateImagePostPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent("/create/image")}`);
        return;
      }
      setUserId(user.id);
    })();
  }, [router]);

  function onPick(f: File | null) {
    setError(null);
    if (!f) return;
    if (!(POST_IMAGE_TYPES as readonly string[]).includes(f.type)) {
      setError("Use JPG, PNG, or WebP.");
      return;
    }
    if (f.size > POST_IMAGE_MAX_BYTES) {
      setError("Image must be under 5 MB.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function publish() {
    if (!userId || !file) {
      setError("Choose an image first.");
      return;
    }
    setLoading(true);
    setError(null);
    setProgress("Uploading…");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("post-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
      if (upErr) throw upErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("post-images").getPublicUrl(path);

      setProgress("Publishing…");
      const { data, error: insErr } = await supabase
        .from("content_posts")
        .insert({
          user_id: userId,
          type: "image",
          body: caption.trim().slice(0, POST_MAX_CHARS),
          image_url: publicUrl,
          category: "general",
          is_active: true,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      router.push(data?.id ? `/post/${data.id}` : "/");
      router.refresh();
    } catch (e) {
      console.error(e);
      setError("Upload failed. Check your connection and try again.");
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-5">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
          Image post
        </p>
        <h1 className="mt-1 text-xl font-bold text-white">Create Image Post</h1>
      </header>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-600 bg-zinc-900/50 px-4 py-10 text-zinc-400 hover:border-violet-500/50"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Preview"
            className="max-h-72 w-full rounded-xl object-contain"
          />
        ) : (
          <>
            <ImagePlus className="h-10 w-10" />
            <span className="text-sm font-medium">Upload image</span>
            <span className="text-xs text-zinc-600">JPG · PNG · WebP · max 5MB</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        capture="environment"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />

      <label className="mt-4 block text-xs font-medium text-zinc-400">
        Caption
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, POST_MAX_CHARS))}
          rows={3}
          placeholder="Add a caption… #OpinionX"
          className="mt-1 w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
      </label>
      <p className="mt-1 text-right text-xs text-zinc-600">
        {caption.length}/{POST_MAX_CHARS}
      </p>

      {progress && (
        <p className="mt-2 text-xs text-violet-300">{progress}</p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-2">
        <Link
          href="/"
          className="flex-1 rounded-full border border-zinc-700 py-3 text-center text-sm font-semibold text-zinc-300"
        >
          Cancel
        </Link>
        <button
          type="button"
          disabled={loading || !file}
          onClick={publish}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-violet-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Publish
        </button>
      </div>
    </div>
  );
}
