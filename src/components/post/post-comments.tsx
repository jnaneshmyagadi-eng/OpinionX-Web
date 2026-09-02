"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export function PostComments({
  postId,
  currentUserId,
}: {
  postId: string;
  currentUserId: string | null;
}) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("post_comments")
      .select(
        `id, content, created_at, profiles:user_id (username, display_name, avatar_url)`
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(50);
    setComments((data as CommentRow[]) ?? []);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    if (!currentUserId || !text.trim()) return;
    setSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("post_comments").insert({
        post_id: postId,
        user_id: currentUserId,
        content: text.trim().slice(0, 1000),
      });
      if (error) throw error;
      setText("");
      await load();
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <h2 className="mb-3 text-sm font-semibold text-white">Comments</h2>
      {loading ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-violet-500" />
      ) : comments.length === 0 ? (
        <p className="text-sm text-zinc-500">No comments yet. Start the conversation.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="text-sm">
              <Link
                href={`/profile/${c.profiles?.username ?? ""}`}
                className="font-semibold text-violet-300 hover:underline"
              >
                {c.profiles?.display_name || c.profiles?.username || "User"}
              </Link>
              <span className="ml-2 text-xs text-zinc-600">
                {formatRelativeTime(c.created_at)}
              </span>
              <p className="mt-0.5 text-zinc-200">{c.content}</p>
            </li>
          ))}
        </ul>
      )}

      {currentUserId ? (
        <div className="mt-4 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-white"
            maxLength={1000}
          />
          <button
            type="button"
            disabled={sending || !text.trim()}
            onClick={send}
            className="rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Post
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">
          <Link href={`/login?redirect=/post/${postId}`} className="text-violet-400">
            Log in
          </Link>{" "}
          to comment.
        </p>
      )}
    </section>
  );
}
