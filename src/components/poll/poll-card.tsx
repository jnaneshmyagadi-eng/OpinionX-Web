"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, calculatePercentages, formatRelativeTime } from "@/lib/utils";
import type { PollWithCreator } from "@/types/database";
import { MOOD_META } from "@/types/database";
import { Button } from "@/components/ui/button";

interface PollCardProps {
  poll: PollWithCreator;
  currentUserId?: string | null;
  onVote?: (pollId: string, choice: "a" | "b") => void;
}

export function PollCard({ poll, currentUserId, onVote }: PollCardProps) {
  const [voted, setVoted] = useState<"a" | "b" | null>(poll.user_vote ?? null);
  const [liked, setLiked] = useState(poll.user_liked ?? false);
  const [saved, setSaved] = useState(poll.user_saved ?? false);
  const [counts, setCounts] = useState({
    a: poll.vote_count_a,
    b: poll.vote_count_b,
    likes: poll.like_count,
  });
  const [loading, setLoading] = useState(false);

  const { percentA, percentB, total } = calculatePercentages(counts.a, counts.b);
  const supabase = createClient();
  const hasImages = !!(poll.image_a_url || poll.image_b_url);
  const showResults = voted !== null;
  const moodKey = poll.mood as keyof typeof MOOD_META;
  const moodMeta = MOOD_META[moodKey];

  async function handleVote(choice: "a" | "b") {
    if (!currentUserId || voted || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("votes").insert({
        poll_id: poll.id,
        user_id: currentUserId,
        choice,
      });
      if (error) throw error;
      setVoted(choice);
      setCounts((c) => ({
        ...c,
        a: choice === "a" ? c.a + 1 : c.a,
        b: choice === "b" ? c.b + 1 : c.b,
      }));
      onVote?.(poll.id, choice);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function toggleLike() {
    if (!currentUserId) return;
    const next = !liked;
    setLiked(next);
    setCounts((c) => ({ ...c, likes: Math.max(0, c.likes + (next ? 1 : -1)) }));
    if (next) {
      await supabase.from("likes").insert({
        poll_id: poll.id,
        user_id: currentUserId,
      });
    } else {
      await supabase
        .from("likes")
        .delete()
        .eq("poll_id", poll.id)
        .eq("user_id", currentUserId);
    }
  }

  async function toggleSave() {
    if (!currentUserId) return;
    const next = !saved;
    setSaved(next);
    if (next) {
      await supabase.from("saves").insert({
        poll_id: poll.id,
        user_id: currentUserId,
      });
    } else {
      await supabase
        .from("saves")
        .delete()
        .eq("poll_id", poll.id)
        .eq("user_id", currentUserId);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/poll/${poll.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: poll.question, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled share */
    }
  }

  const creator = poll.profiles;

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <Link
          href={`/profile/${creator?.username ?? ""}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-sm font-semibold"
        >
          {creator?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creator.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            (creator?.username?.[0] ?? "?").toUpperCase()
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${creator?.username ?? ""}`}
            className="truncate text-sm font-semibold text-white hover:underline"
          >
            {creator?.display_name || creator?.username || "Anonymous"}
          </Link>
          <p className="text-xs text-zinc-500">
            {formatRelativeTime(poll.created_at)}
            {moodMeta && (
              <>
                {" · "}
                <span>
                  {moodMeta.emoji} {moodMeta.label}
                </span>
              </>
            )}
          </p>
        </div>
        <button
          className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-800"
          aria-label="More"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Question */}
      <Link href={`/poll/${poll.id}`} className="block px-4 py-3">
        <h2 className="text-base font-medium leading-snug text-zinc-100">
          {poll.question}
        </h2>
      </Link>

      {/* Two-image VS layout */}
      {hasImages ? (
        <div className="relative grid grid-cols-2 gap-0.5 px-0.5">
          {(["a", "b"] as const).map((choice) => {
            const isA = choice === "a";
            const label = isA ? poll.option_a : poll.option_b;
            const image = isA ? poll.image_a_url : poll.image_b_url;
            const percent = isA ? percentA : percentB;
            const isSelected = voted === choice;

            return (
              <button
                key={choice}
                type="button"
                disabled={!!voted || loading || !currentUserId}
                onClick={() => handleVote(choice)}
                className={cn(
                  "relative aspect-[3/4] overflow-hidden bg-zinc-800 transition",
                  isSelected && "ring-2 ring-inset ring-purple-500",
                  !voted && currentUserId && "active:opacity-90"
                )}
                aria-label={`Vote for ${label}`}
              >
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt={label}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-zinc-800 px-2 text-center text-sm text-zinc-400">
                    {label}
                  </div>
                )}
                {/* Label + % overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-10">
                  <p className="text-sm font-semibold text-white drop-shadow">
                    {label}
                  </p>
                  {showResults && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-0.5 text-lg font-bold text-white"
                    >
                      {percent}%
                    </motion.p>
                  )}
                </div>
                {showResults && (
                  <motion.div
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-1",
                      isA
                        ? "bg-gradient-to-r from-purple-500 to-purple-400"
                        : "bg-gradient-to-r from-pink-500 to-orange-400"
                    )}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: percent / 100 }}
                    style={{ transformOrigin: "left" }}
                    transition={{ duration: 0.5 }}
                  />
                )}
              </button>
            );
          })}
          {/* VS badge */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950/90 text-xs font-black text-white ring-2 ring-zinc-700">
              VS
            </span>
          </div>
        </div>
      ) : (
        /* Text-only options */
        <div className="space-y-2 px-4 pb-1">
          {(["a", "b"] as const).map((choice) => {
            const isA = choice === "a";
            const label = isA ? poll.option_a : poll.option_b;
            const percent = isA ? percentA : percentB;
            const isSelected = voted === choice;

            return (
              <button
                key={choice}
                type="button"
                disabled={!!voted || loading || !currentUserId}
                onClick={() => handleVote(choice)}
                className={cn(
                  "relative w-full overflow-hidden rounded-xl border text-left transition-all",
                  showResults
                    ? isSelected
                      ? "border-purple-500/60 bg-purple-500/10"
                      : "border-zinc-700/60 bg-zinc-800/40"
                    : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500"
                )}
              >
                {showResults && (
                  <motion.div
                    className={cn(
                      "absolute inset-y-0 left-0",
                      isA
                        ? "bg-gradient-to-r from-purple-600/30 to-purple-500/10"
                        : "bg-gradient-to-r from-pink-600/30 to-orange-500/10"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                )}
                <div className="relative flex items-center justify-between gap-3 p-3">
                  <span className="text-sm font-medium text-zinc-100">
                    {label}
                  </span>
                  {showResults && (
                    <span className="text-sm font-bold text-white">
                      {percent}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {total > 0 && (
        <p className="px-4 pt-2 text-center text-xs text-zinc-500">
          {total.toLocaleString()} vote{total !== 1 ? "s" : ""}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 border-t border-zinc-800/60 px-2 py-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLike}
          className={cn("gap-1.5", liked && "text-pink-400")}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-current")} />
          <span className="text-xs">{counts.likes || ""}</span>
        </Button>
        <Link href={`/poll/${poll.id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            aria-label="Comments"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{poll.comment_count || ""}</span>
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSave}
          className={cn(saved && "text-orange-400")}
          aria-label={saved ? "Unsave" : "Save"}
        >
          <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="ml-auto"
          aria-label="Share"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}
