"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { PollCard, PENDING_VOTE_KEY } from "@/components/poll/poll-card";
import type { PollWithCreator, CommentWithAuthor } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Sparkles } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { summarizeComments } from "@/lib/discovery";

export function PollDetailClient({ pollId }: { pollId: string }) {
  const id = pollId;
  const [poll, setPoll] = useState<PollWithCreator | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [newComment, setNewComment] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const pendingApplied = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const { data: p } = await supabase
        .from("polls")
        .select(
          `*, profiles:creator_id (id, username, display_name, avatar_url)`
        )
        .eq("id", id)
        .single();

      if (p) {
        const enriched: PollWithCreator = {
          ...p,
          profiles: p.profiles as PollWithCreator["profiles"],
        };
        if (user) {
          const [v, l, s] = await Promise.all([
            supabase
              .from("votes")
              .select("choice")
              .eq("poll_id", id)
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase
              .from("likes")
              .select("id")
              .eq("poll_id", id)
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase
              .from("saves")
              .select("id")
              .eq("poll_id", id)
              .eq("user_id", user.id)
              .maybeSingle(),
          ]);
          enriched.user_vote = (v.data?.choice as "a" | "b") ?? null;
          enriched.user_liked = !!l.data;
          enriched.user_saved = !!s.data;

          if (!enriched.user_vote && !pendingApplied.current) {
            let pending: string | null = null;
            try {
              pending = sessionStorage.getItem(PENDING_VOTE_KEY(id));
            } catch {
              pending = null;
            }
            if (pending === "a" || pending === "b") {
              pendingApplied.current = true;
              try {
                sessionStorage.removeItem(PENDING_VOTE_KEY(id));
              } catch {
                /* ignore */
              }
              const { error } = await supabase.from("votes").insert({
                poll_id: id,
                user_id: user.id,
                choice: pending,
              });
              if (!error) {
                enriched.user_vote = pending;
                if (pending === "a") {
                  enriched.vote_count_a = (enriched.vote_count_a ?? 0) + 1;
                } else {
                  enriched.vote_count_b = (enriched.vote_count_b ?? 0) + 1;
                }
              }
            }
          }
        }
        setPoll(enriched);
      }

      const { data: c } = await supabase
        .from("comments")
        .select(`*, profiles:user_id (id, username, display_name, avatar_url)`)
        .eq("poll_id", id)
        .order("created_at", { ascending: true });

      const mapped = (c ?? []).map((cm) => ({
        ...cm,
        profiles: cm.profiles as CommentWithAuthor["profiles"],
      }));
      setComments(mapped);

      if (p) {
        setSummary(
          summarizeComments(
            mapped,
            p.option_a,
            p.option_b,
            p.vote_count_a,
            p.vote_count_b
          )
        );
      }

      setLoading(false);
    }
    load();
  }, [id, supabase]);

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !newComment.trim()) return;
    setPosting(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          poll_id: id,
          user_id: userId,
          content: newComment.trim(),
        })
        .select(`*, profiles:user_id (id, username, display_name, avatar_url)`)
        .single();
      if (error) throw error;
      const next = [
        ...comments,
        { ...data, profiles: data.profiles as CommentWithAuthor["profiles"] },
      ];
      setComments(next);
      setNewComment("");
      if (poll) {
        setSummary(
          summarizeComments(
            next,
            poll.option_a,
            poll.option_b,
            poll.vote_count_a,
            poll.vote_count_b
          )
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!poll) {
    return null;
  }

  return (
    <>
      <PollCard poll={poll} currentUserId={userId} />

      {summary && (
        <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4 text-purple-400" />
            What people are saying
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300">{summary}</p>
          <p className="mt-2 text-[10px] text-zinc-600">
            Summary is built only from vote counts and real comments — no
            invented reasons.
          </p>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-zinc-400">
          Comments ({comments.length})
        </h2>

        <form onSubmit={postComment} className="mb-4 flex gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={userId ? "Add a comment…" : "Sign in to comment"}
            disabled={!userId}
            maxLength={500}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!userId || posting || !newComment.trim()}
          >
            {posting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-xs font-bold">
                {c.profiles?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.profiles.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (c.profiles?.username?.[0] ?? "?").toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm">
                  <span className="font-semibold text-white">
                    {c.profiles?.display_name || c.profiles?.username}
                  </span>{" "}
                  <span className="text-zinc-300">{c.content}</span>
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {formatRelativeTime(c.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
