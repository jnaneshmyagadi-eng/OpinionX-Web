"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PollCard } from "@/components/poll/poll-card";
import type { PollWithCreator, Profile } from "@/types/database";
import { calculateVibeMatch } from "@/lib/utils";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ExplorePage() {
  const [polls, setPolls] = useState<PollWithCreator[]>([]);
  const [users, setUsers] = useState<(Profile & { vibe?: number })[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      let moods: string[] = [];
      let cats: string[] = [];
      if (user) {
        const { data: me } = await supabase
          .from("profiles")
          .select("moods, categories_interest")
          .eq("id", user.id)
          .single();
        moods = me?.moods ?? [];
        cats = me?.categories_interest ?? [];
      }

      const { data } = await supabase
        .from("polls")
        .select(
          `*, profiles:creator_id (id, username, display_name, avatar_url, moods, categories_interest)`
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(40);

      setPolls(
        (data ?? []).map((p) => ({
          ...p,
          profiles: p.profiles as PollWithCreator["profiles"],
        }))
      );

      const { data: people } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user?.id ?? "00000000-0000-0000-0000-000000000000")
        .limit(20);

      const withVibe = (people ?? []).map((u) => ({
        ...u,
        vibe: calculateVibeMatch(
          moods.length ? moods : ["curious"],
          cats.length ? cats : ["general"],
          u.moods ?? [],
          u.categories_interest ?? []
        ),
      }));
      setUsers(withVibe.sort((a, b) => (b.vibe ?? 0) - (a.vibe ?? 0)));
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = query
    ? polls.filter(
        (p) =>
          p.question.toLowerCase().includes(query.toLowerCase()) ||
          p.option_a.toLowerCase().includes(query.toLowerCase()) ||
          p.option_b.toLowerCase().includes(query.toLowerCase())
      )
    : polls;

  return (
    <div className="px-3 py-4">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search polls…"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none"
        />
      </div>

      {users.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            People with your vibe
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {users.slice(0, 10).map((u) => (
              <Link
                key={u.id}
                href={`/profile/${u.username}`}
                className="flex w-28 shrink-0 flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 text-center"
              >
                <div className="mb-2 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-lg font-bold">
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    u.username[0].toUpperCase()
                  )}
                </div>
                <p className="truncate text-xs font-medium text-white">
                  {u.display_name || u.username}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold text-pink-400">
                  {u.vibe}% Vibe Match
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2 h-7 px-2 text-[10px]"
                >
                  Say Hi
                </Button>
              </Link>
            ))}
          </div>
        </section>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
        Discover polls
      </h2>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">No polls found</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((poll) => (
            <PollCard key={poll.id} poll={poll} currentUserId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}
