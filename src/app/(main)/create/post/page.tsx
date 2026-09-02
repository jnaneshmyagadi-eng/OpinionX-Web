"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { POST_MAX_CHARS } from "@/types/content";
import { Loader2 } from "lucide-react";

export default function CreateTextPostPage() {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent("/create/post")}`);
        return;
      }
      setUserId(user.id);
    })();
  }, [router]);

  async function publish() {
    if (!userId) return;
    const text = body.trim();
    if (text.length < 1) {
      setError("Write something first.");
      return;
    }
    if (text.length > POST_MAX_CHARS) {
      setError(`Max ${POST_MAX_CHARS} characters.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("content_posts")
        .insert({
          user_id: userId,
          type: "text",
          body: text,
          category,
          is_active: true,
        })
        .select("id")
        .single();
      if (err) throw err;
      router.push(data?.id ? `/post/${data.id}` : "/");
      router.refresh();
    } catch (e) {
      console.error(e);
      setError("Could not publish. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-5">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Text post
        </p>
        <h1 className="mt-1 text-xl font-bold text-white">Create Post</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Share a thought. Keep it real. Hashtags welcome.
        </p>
      </header>

      <label className="sr-only" htmlFor="post-body">
        What&apos;s on your mind?
      </label>
      <textarea
        id="post-body"
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, POST_MAX_CHARS))}
        placeholder="What's on your mind?"
        rows={8}
        className="w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
      />
      <div className="mt-1 flex justify-between text-xs text-zinc-500">
        <span>Tip: #India #AI</span>
        <span>
          {body.length}/{POST_MAX_CHARS}
        </span>
      </div>

      <label className="mt-4 block text-xs font-medium text-zinc-400">
        Category
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white"
        >
          {["general", "lifestyle", "tech", "entertainment", "career", "sports"].map(
            (c) => (
              <option key={c} value={c}>
                {c}
              </option>
            )
          )}
        </select>
      </label>

      {error && (
        <p className="mt-3 text-sm text-red-400" role="alert">
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
          disabled={loading || !body.trim()}
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
