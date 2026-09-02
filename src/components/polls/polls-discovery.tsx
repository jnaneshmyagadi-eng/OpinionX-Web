"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PollCard } from "@/components/poll/poll-card";
import type { PollWithCreator } from "@/types/database";
import { CATEGORIES } from "@/types/database";
import { cn } from "@/lib/utils";
import { sortByTrending } from "@/lib/discovery";
import { Loader2 } from "lucide-react";

type SortTab =
  | "trending"
  | "new"
  | "most_voted"
  | "close"
  | "divided";

export function PollsDiscovery() {
  const [tab, setTab] = useState<SortTab>("trending");
  const [category, setCategory] = useState<string | null>(null);
  const [polls, setPolls] = useState<PollWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
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
        .limit(60);

      if (category) {
        query = query.eq("category", category);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      let list: PollWithCreator[] = (data ?? []).map((p) => ({
        ...p,
        profiles: p.profiles as PollWithCreator["profiles"],
      }));

      if (tab === "trending") {
        list = sortByTrending(list);
      } else if (tab === "most_voted") {
        list = [...list].sort(
          (a, b) =>
            b.vote_count_a +
            b.vote_count_b -
            (a.vote_count_a + a.vote_count_b)
        );
      } else if (tab === "close" || tab === "divided") {
        list = list
          .filter((p) => {
            const t = p.vote_count_a + p.vote_count_b;
            if (t < 2) return false;
            const pct = Math.abs(p.vote_count_a - p.vote_count_b) / t;
            return tab === "close" ? pct <= 0.12 : pct <= 0.2;
          })
          .sort(
            (a, b) =>
              b.vote_count_a +
              b.vote_count_b -
              (a.vote_count_a + a.vote_count_b)
          );
      }

      if (user && list.length) {
        const ids = list.map((p) => p.id);
        const { data: votes } = await supabase
          .from("votes")
          .select("poll_id, choice")
          .eq("user_id", user.id)
          .in("poll_id", ids);
        const voteMap = new Map(
          (votes ?? []).map((v) => [v.poll_id, v.choice as "a" | "b"])
        );
        list = list.map((p) => ({
          ...p,
          user_vote: voteMap.get(p.id) ?? null,
        }));
      }

      setPolls(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab, category]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: "trending" as const, label: "🔥 Trending" },
            { id: "new" as const, label: "🆕 New" },
            { id: "most_voted" as const, label: "🏆 Most voted" },
            { id: "close" as const, label: "⚡ Too close" },
            { id: "divided" as const, label: "🔥 Divided" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              tab === t.id
                ? "bg-violet-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
            !category ? "bg-zinc-700 text-white" : "bg-zinc-800/70 text-zinc-500"
          )}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c === category ? null : c)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize",
              category === c
                ? "bg-zinc-700 text-white ring-1 ring-violet-500"
                : "bg-zinc-800/70 text-zinc-500"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          { href: "/polls/india", label: "🇮🇳 India" },
          { href: "/polls/tech", label: "📱 Tech" },
          { href: "/polls/relationships", label: "❤️ Relationships" },
          { href: "/polls/career", label: "💼 Career" },
          { href: "/polls/entertainment", label: "🎬 Entertainment" },
          { href: "/polls/sports", label: "🏏 Sports" },
        ].map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-center text-xs font-medium text-zinc-300 hover:border-violet-500/40"
          >
            {c.label}
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
        </div>
      ) : polls.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-500">
          No polls in this view.{" "}
          <Link href="/create" className="text-violet-400">
            Create one
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              currentUserId={userId}
              onVote={() => load()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
