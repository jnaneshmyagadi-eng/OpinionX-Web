"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, validateImageFile } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditProfilePage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirect=/profile/edit");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) {
        setUsername(data.username);
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setAvatarUrl(data.avatar_url);
      }
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  function onPick(f: File | undefined) {
    if (!f) return;
    const err = validateImageFile(f);
    if (err) {
      setError(err);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let nextAvatar = avatarUrl;
      if (file) {
        nextAvatar = await uploadImage(file, "avatars", user.id);
      }

      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          username: cleanUsername,
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          avatar_url: nextAvatar,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (upErr) {
        if (upErr.message.includes("unique") || upErr.code === "23505") {
          setError("Username is already taken");
        } else {
          setError(upErr.message);
        }
        return;
      }
      setSuccess(true);
      setAvatarUrl(nextAvatar);
      setTimeout(() => router.push("/profile"), 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const shown = preview || avatarUrl;

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/profile" className="rounded-full p-1.5 hover:bg-zinc-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-white">Edit profile</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-3xl font-bold"
          >
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shown} alt="" className="h-full w-full object-cover" />
            ) : (
              username[0]?.toUpperCase()
            )}
            <span className="absolute bottom-0 right-0 rounded-full bg-zinc-900 p-1.5 ring-2 ring-zinc-950">
              <Camera className="h-4 w-4 text-white" />
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <p className="mt-2 text-xs text-zinc-500">Tap to change photo</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            maxLength={30}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">
            Display name
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={160}
            className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            Profile saved
          </p>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => router.push("/profile")}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
