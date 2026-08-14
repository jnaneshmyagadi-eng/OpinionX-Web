"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PollCard } from "@/components/poll/poll-card";
import type { PollWithCreator } from "@/types/database";
import { MOODS, MOOD_META } from "@/types/database";
import { cn } from "@/lib/utils";
import { sortByTrending } from "@/lib/discovery";
import { Loader2 } from "lucide-react";

type FeedTab = "trending" | "for_you" | "new";

export function HomeFeed() {
  const [polls, setPolls] = useState<PollWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FeedTab>("trending");
  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const loadPolls = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      let query = supabase
        .from("polls")
        .select(
          `*, profiles:creator_id (id, username, display_name, avatar_url)`
        )
        .eq("is_active", true)
        .limit(50);

      if (moodFilter) {
        query = query.eq("mood", moodFilter);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      let enriched: PollWithCreator[] = (data ?? []).map((p) => ({
        ...p,
        profiles: p.profiles as PollWithCreator["profiles"],
      }));

      if (tab === "trending") {
        enriched = sortByTrending(enriched);
      } else if (tab === "for_you" && user) {
        const { data: me } = await supabase
          .from("profiles")
          .select("moods, categories_interest")
          .eq("id", user.id)
          .single();
        const moods = new Set(me?.moods ?? []);
        const cats = new Set(me?.categories_interest ?? []);
        enriched = [...enriched].sort((a, b) => {
          const score = (p: PollWithCreator) =>
            (moods.has(p.mood) ? 2 : 0) +
            (cats.has(p.category) ? 2 : 0) +
            (p.vote_count_a + p.vote_count_b) * 0.01;
          return score(b) - score(a);
        });
      }

      if (user) {
        const pollIds = enriched.map((p) => p.id);
        if (pollIds.length) {
          const [votesRes, likesRes, savesRes] = await Promise.all([
            supabase
              .from("votes")
              .select("poll_id, choice")
              .eq("user_id", user.id)
              .in("poll_id", pollIds),
            supabase
              .from("likes")
              .select("poll_id")
              .eq("user_id", user.id)
              .in("poll_id", pollIds),
            supabase
              .from("saves")
              .select("poll_id")
              .eq("user_id", user.id)
              .in("poll_id", pollIds),
          ]);

          const voteMap = new Map(
            (votesRes.data ?? []).map((v) => [v.poll_id, v.choice as "a" | "b"])
          );
          const likeSet = new Set((likesRes.data ?? []).map((l) => l.poll_id));
          const saveSet = new Set((savesRes.data ?? []).map((s) => s.poll_id));

          enriched = enriched.map((p) => ({
            ...p,
            user_vote: voteMap.get(p.id) ?? null,
            user_liked: likeSet.has(p.id),
            user_saved: saveSet.has(p.id),
          }));
        }
      }

      setPolls(enriched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab, moodFilter]);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: "trending" as const, label: "🔥 Trending Now" },
            { id: "for_you" as const, label: "For You" },
            { id: "new" as const, label: "New Opinions" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition",
              tab === t.id
                ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setMoodFilter(null)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition",
            !moodFilter
              ? "bg-zinc-700 text-white"
              : "bg-zinc-800/60 text-zinc-500"
          )}
        >
          All
        </button>
        {MOODS.map((m) => (
          <button
            key={m}
            onClick={() => setMoodFilter(m === moodFilter ? null : m)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition",
              moodFilter === m
                ? "bg-zinc-700 text-white ring-1 ring-purple-500"
                : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
            )}
          >
            {MOOD_META[m].emoji} {MOOD_META[m].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : polls.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-zinc-500">No opinions yet on OpinionX.</p>
          <p className="mt-1 text-sm text-zinc-600">
            Be the first to ask what people really think.
          </p>
        </div>
      ) : (
        <div className="snap-y snap-mandatory space-y-4">
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              currentUserId={userId}
              onVote={() => loadPolls()}
              reel
            />
          ))}
        </div>
      )}
    </div>
  );
}
