"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PollCard } from "@/components/poll/poll-card";
import type { PollWithCreator } from "@/types/database";
import { MOODS } from "@/types/database";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type SortMode = "trending" | "new";

export default function HomePage() {
  const [polls, setPolls] = useState<PollWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("trending");
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
          `
          *,
          profiles:creator_id (id, username, display_name, avatar_url)
        `
        )
        .eq("is_active", true)
        .limit(30);

      if (moodFilter) {
        query = query.eq("mood", moodFilter);
      }

      if (sort === "new") {
        query = query.order("created_at", { ascending: false });
      } else {
        // simple trending: total votes then recency
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      let enriched: PollWithCreator[] = (data ?? []).map((p) => ({
        ...p,
        profiles: p.profiles as PollWithCreator["profiles"],
      }));

      // sort client-side for trending
      if (sort === "trending") {
        enriched = [...enriched].sort(
          (a, b) =>
            b.vote_count_a +
            b.vote_count_b +
            b.like_count * 2 -
            (a.vote_count_a + a.vote_count_b + a.like_count * 2)
        );
      }

      if (user) {
        const pollIds = enriched.map((p) => p.id);
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

      setPolls(enriched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [sort, moodFilter]);

  useEffect(() => {
    loadPolls();
  }, [loadPolls]);

  return (
    <div className="px-3 py-4">
      {/* Sort & filters */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
        {(["trending", "new"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium capitalize transition",
              sort === s
                ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            )}
          >
            {s}
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-zinc-700" />
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
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition",
              moodFilter === m
                ? "bg-zinc-700 text-white"
                : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : polls.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-zinc-500">No polls yet.</p>
          <p className="mt-1 text-sm text-zinc-600">
            Be the first to create one!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              currentUserId={userId}
              onVote={() => loadPolls()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
