"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Check,
  BarChart3,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, calculatePercentages, formatRelativeTime } from "@/lib/utils";
import type { PollWithCreator } from "@/types/database";
import { MOOD_META } from "@/types/database";
import { Button } from "@/components/ui/button";
import { VoteConnect } from "@/components/poll/vote-connect";

const PENDING_VOTE_KEY = (pollId: string) => `pending_vote_${pollId}`;

interface PollCardProps {
  poll: PollWithCreator;
  currentUserId?: string | null;
  onVote?: (pollId: string, choice: "a" | "b") => void;
  /** Larger mobile “reel” presentation */
  reel?: boolean;
}

function buildShareText(
  optionA: string,
  optionB: string,
  percentA: number,
  percentB: number,
  total: number,
  url: string
): string {
  if (total > 0) {
    return `I just voted on this 👀\n\n${optionA} vs ${optionB}\n\n${percentA}% vs ${percentB}% · ${total.toLocaleString()} votes\n\nWhat would you choose?\n${url}\n\n#LetTheInternetDecide`;
  }
  return `I just voted on this 👀\n\n${optionA} vs ${optionB}\n\nWhat would you choose?\n${url}\n\n#LetTheInternetDecide`;
}

export function PollCard({
  poll,
  currentUserId,
  onVote,
  reel = false,
}: PollCardProps) {
  const [voted, setVoted] = useState<"a" | "b" | null>(poll.user_vote ?? null);
  const [liked, setLiked] = useState(poll.user_liked ?? false);
  const [saved, setSaved] = useState(poll.user_saved ?? false);
  const [following, setFollowing] = useState(false);
  const [counts, setCounts] = useState({
    a: poll.vote_count_a,
    b: poll.vote_count_b,
    likes: poll.like_count,
  });
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [copied, setCopied] = useState(false);

  const { percentA, percentB, total } = calculatePercentages(counts.a, counts.b);
  const supabase = createClient();
  const hasImages = !!(poll.image_a_url || poll.image_b_url);
  // Live results when votes exist; always after this user votes
  const showResults = voted !== null || total > 0;
  const moodKey = poll.mood as keyof typeof MOOD_META;
  const moodMeta = MOOD_META[moodKey];
  const creator = poll.profiles;
  const isOwn = !!currentUserId && currentUserId === poll.creator_id;
  const closeRace =
    total >= 5 && Math.abs(percentA - percentB) <= 8;

  function getPollUrl() {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/poll/${poll.id}`;
    }
    return `/poll/${poll.id}`;
  }

  function getShareText() {
    return buildShareText(
      poll.option_a,
      poll.option_b,
      percentA,
      percentB,
      total,
      getPollUrl()
    );
  }

  async function handleVote(choice: "a" | "b") {
    if (voted || loading) return;

    if (!currentUserId) {
      try {
        sessionStorage.setItem(PENDING_VOTE_KEY(poll.id), choice);
      } catch {
        /* private mode */
      }
      const redirect = encodeURIComponent(`/poll/${poll.id}`);
      window.location.assign(`/signup?redirect=${redirect}`);
      return;
    }

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
      setShowSharePanel(true);
      onVote?.(poll.id, choice);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFollow() {
    if (!currentUserId || isOwn || !creator?.id || followLoading) return;
    setFollowLoading(true);
    try {
      if (following) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", creator.id);
        setFollowing(false);
      } else {
        await supabase.from("follows").insert({
          follower_id: currentUserId,
          following_id: creator.id,
        });
        setFollowing(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFollowLoading(false);
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

  async function handleNativeShare() {
    const url = getPollUrl();
    const text = getShareText();
    try {
      if (navigator.share) {
        await navigator.share({ title: poll.question, text, url });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* cancelled */
    }
  }

  function shareWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(getShareText())}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function shareX() {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareText())}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(getShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-900/70",
        reel && "snap-start"
      )}
    >
      {/* Creator row */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <Link
          href={`/profile/${creator?.username ?? ""}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-600 text-sm font-semibold"
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
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${creator?.username ?? ""}`}
              className="truncate text-sm font-semibold text-white hover:underline"
            >
              {creator?.display_name || creator?.username || "Anonymous"}
            </Link>
            <span className="inline-flex items-center gap-0.5 rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-300 ring-1 ring-violet-500/30">
              <BarChart3 className="h-3 w-3" />
              Poll
            </span>
          </div>
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
            {" · "}
            <span className="capitalize">{poll.category}</span>
          </p>
        </div>
        {currentUserId && !isOwn && creator?.id && (
          <button
            type="button"
            disabled={followLoading}
            onClick={toggleFollow}
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              following
                ? "bg-zinc-800 text-zinc-300 ring-1 ring-zinc-700"
                : "bg-white text-zinc-900"
            )}
            aria-label={following ? "Unfollow" : "Follow"}
          >
            {following ? (
              <UserCheck className="h-3.5 w-3.5" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
            {following ? "Following" : "Follow"}
          </button>
        )}
      </div>

      <Link href={`/poll/${poll.id}`} className="block px-4 py-3">
        <h2
          className={cn(
            "font-semibold leading-snug text-zinc-50",
            reel ? "text-lg" : "text-[15px]"
          )}
        >
          {poll.question}
        </h2>
      </Link>

      {/* Results banner — distinctive poll identity */}
      {showResults && (
        <div className="mx-4 mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-violet-400">
            The internet has spoken
          </p>
          {closeRace && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
              ⚡ Too close to call
            </span>
          )}
        </div>
      )}

      {!showResults && (
        <p className="mb-2 px-4 text-center text-[11px] font-medium text-zinc-500">
          Vote to see how the internet decides
        </p>
      )}

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
                disabled={!!voted || loading}
                onClick={() => handleVote(choice)}
                className={cn(
                  "poll-option relative overflow-hidden bg-zinc-800",
                  reel ? "aspect-[3/5]" : "aspect-[3/4]",
                  isSelected && "ring-2 ring-inset ring-violet-500",
                  !voted && "active:opacity-90"
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
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 pt-12">
                  <p className="text-sm font-semibold text-white drop-shadow">
                    {label}
                  </p>
                  {showResults && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-0.5 text-xl font-bold tabular-nums text-white"
                    >
                      {percent}%
                    </motion.p>
                  )}
                </div>
                {showResults && (
                  <motion.div
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-1.5",
                      isA ? "bg-violet-500" : "bg-fuchsia-500"
                    )}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: percent / 100 }}
                    style={{ transformOrigin: "left" }}
                    transition={{ duration: 0.55 }}
                  />
                )}
              </button>
            );
          })}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950/95 text-xs font-black text-white ring-2 ring-zinc-600">
              VS
            </span>
          </div>
        </div>
      ) : (
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
                disabled={!!voted || loading}
                onClick={() => handleVote(choice)}
                className={cn(
                  "poll-option relative w-full overflow-hidden rounded-xl border text-left",
                  showResults
                    ? isSelected
                      ? "border-violet-500/70 bg-violet-500/10"
                      : "border-zinc-700/60 bg-zinc-800/40"
                    : "border-zinc-700 bg-zinc-800/60 hover:border-zinc-500"
                )}
              >
                {showResults && (
                  <motion.div
                    className={cn(
                      "absolute inset-y-0 left-0",
                      isA
                        ? "bg-violet-600/25"
                        : "bg-fuchsia-600/25"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                )}
                <div className="relative flex items-center justify-between gap-3 p-3.5">
                  <span className="text-sm font-medium text-zinc-100">
                    {label}
                  </span>
                  {showResults && (
                    <span className="text-base font-bold tabular-nums text-white">
                      {percent}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between px-4 pt-2.5">
        <p className="text-xs text-zinc-500">
          {total > 0
            ? `${total.toLocaleString()} vote${total !== 1 ? "s" : ""}`
            : "Be the first to vote"}
        </p>
        {voted && (
          <p className="text-xs font-medium text-violet-300">
            You chose {voted === "a" ? poll.option_a : poll.option_b}
          </p>
        )}
      </div>

      {!currentUserId && !voted && (
        <p className="px-4 pt-1 text-center text-[11px] text-zinc-500">
          Tap a side · signup takes seconds · then your vote counts
        </p>
      )}

      {voted && currentUserId && (
        <div className="px-3">
          <VoteConnect
            pollId={poll.id}
            choice={voted}
            optionLabel={voted === "a" ? poll.option_a : poll.option_b}
            currentUserId={currentUserId}
          />
        </div>
      )}

      {/* Share after vote */}
      {(showSharePanel || voted) && (
        <div className="mx-3 mb-2 mt-2 rounded-xl border border-violet-500/25 bg-violet-500/10 p-3">
          <p className="mb-2 text-center text-xs font-semibold text-violet-200">
            Share the result
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={shareWhatsApp}
              className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white active:opacity-90"
            >
              WhatsApp
            </button>
            <button
              type="button"
              onClick={shareX}
              className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 active:opacity-90"
            >
              Post on X
            </button>
            <button
              type="button"
              onClick={copyResult}
              className="rounded-full border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 active:opacity-90"
            >
              {copied ? (
                <span className="inline-flex items-center gap-1">
                  <Check className="h-3 w-3" /> Copied
                </span>
              ) : (
                "Copy result"
              )}
            </button>
          </div>
        </div>
      )}

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
          onClick={() => {
            setShowSharePanel(true);
            void handleNativeShare();
          }}
          className="ml-auto"
          aria-label="Share"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}

export { PENDING_VOTE_KEY };
