"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PollCard } from "@/components/poll/poll-card";
import { PostCard } from "@/components/post/post-card";
import { PeopleLikeYou } from "@/components/explore/people-like-you";
import type { PollWithCreator, Profile } from "@/types/database";
import type { ContentPostWithAuthor, FeedItem } from "@/types/content";
import {
  rankPeopleLikeYou,
  type SimilarUser,
} from "@/lib/discovery";
import { mergeFeed } from "@/lib/feed";
import { Loader2, Search } from "lucide-react";
import { cn, calculatePercentages } from "@/lib/utils";
import Link from "next/link";

type ExploreTab = "trending" | "new" | "popular";

export default function ExplorePage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [pollsRaw, setPollsRaw] = useState<PollWithCreator[]>([]);
  const [similar, setSimilar] = useState<SimilarUser[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ExploreTab>("trending");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userHits, setUserHits] = useState<Profile[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const [{ data: pollData }, { data: postData }] = await Promise.all([
        supabase
          .from("polls")
          .select(
            `*, profiles:creator_id (id, username, display_name, avatar_url, moods, categories_interest)`
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("content_posts")
          .select(
            `*, profiles:user_id (id, username, display_name, avatar_url)`
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(40),
      ]);

      let list: PollWithCreator[] = (pollData ?? []).map((p) => ({
        ...p,
        profiles: p.profiles as PollWithCreator["profiles"],
      }));

      let posts: ContentPostWithAuthor[] = (postData ?? []).map((p) => ({
        ...(p as ContentPostWithAuthor),
        profiles: p.profiles as ContentPostWithAuthor["profiles"],
      }));

      if (user) {
        const pollIds = list.map((p) => p.id);
        const postIds = posts.map((p) => p.id);

        if (pollIds.length) {
          const { data: myVotes } = await supabase
            .from("votes")
            .select("poll_id, choice")
            .eq("user_id", user.id)
            .in("poll_id", pollIds);

          const voteMap = new Map(
            (myVotes ?? []).map((v) => [v.poll_id, v.choice as "a" | "b"])
          );
          list = list.map((p) => ({
            ...p,
            user_vote: voteMap.get(p.id) ?? null,
          }));

          const myMap = new Map(voteMap);
          if (myMap.size > 0) {
            const votedPollIds = [...myMap.keys()];
            const { data: others } = await supabase
              .from("votes")
              .select("user_id, poll_id, choice")
              .in("poll_id", votedPollIds)
              .neq("user_id", user.id)
              .limit(500);

            const otherIds = [
              ...new Set((others ?? []).map((o) => o.user_id)),
            ];
            if (otherIds.length) {
              const { data: profiles } = await supabase
                .from("profiles")
                .select("*")
                .in("id", otherIds);
              setSimilar(
                rankPeopleLikeYou(
                  myMap,
                  (others ?? []).map((o) => ({
                    user_id: o.user_id,
                    poll_id: o.poll_id,
                    choice: o.choice as "a" | "b",
                  })),
                  profiles ?? []
                )
              );
            }
          }
        }

        if (postIds.length) {
          const [likesRes, savesRes] = await Promise.all([
            supabase
              .from("post_likes")
              .select("post_id")
              .eq("user_id", user.id)
              .in("post_id", postIds),
            supabase
              .from("post_saves")
              .select("post_id")
              .eq("user_id", user.id)
              .in("post_id", postIds),
          ]);
          const likeSet = new Set((likesRes.data ?? []).map((l) => l.post_id));
          const saveSet = new Set((savesRes.data ?? []).map((s) => s.post_id));
          posts = posts.map((p) => ({
            ...p,
            user_liked: likeSet.has(p.id),
            user_saved: saveSet.has(p.id),
          }));
        }
      }

      setPollsRaw(list);
      setItems(mergeFeed(list, posts, "trending"));
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function searchUsers() {
      if (!query.trim()) {
        setUserHits([]);
        return;
      }
      const q = query.trim().toLowerCase();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(8);
      setUserHits(data ?? []);
    }
    const t = setTimeout(searchUsers, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  let display = [...items];
  if (tab === "new") {
    display = display.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } else if (tab === "popular") {
    display = display.sort((a, b) => b.score - a.score);
  }

  if (query.trim()) {
    const q = query.toLowerCase().replace(/^#/, "");
    display = display.filter((item) => {
      if (item.kind === "poll") {
        const p = item.poll;
        return (
          p.question.toLowerCase().includes(q) ||
          p.option_a.toLowerCase().includes(q) ||
          p.option_b.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.mood.toLowerCase().includes(q)
        );
      }
      return (
        item.post.body.toLowerCase().includes(q) ||
        item.post.category.toLowerCase().includes(q)
      );
    });
  }

  const trendingPreview = pollsRaw.slice(0, 5).map((p, i) => {
    const { percentA, total } = calculatePercentages(
      p.vote_count_a,
      p.vote_count_b
    );
    return { p, i, percentA, total };
  });

  return (
    <div className="px-3 py-4">
      <header className="mb-3">
        <h1 className="text-lg font-bold text-white">Discover</h1>
        <p className="text-xs text-zinc-500">
          Search posts, polls, and people
        </p>
      </header>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search polls, posts, #hashtags, people…"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
      </div>

      {userHits.length > 0 && (
        <div className="mb-4 space-y-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-2">
          {userHits.map((u) => (
            <Link
              key={u.id}
              href={`/profile/${u.username}`}
              className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-zinc-800"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-bold">
                {u.username[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-white">
                  {u.display_name || u.username}
                </p>
                <p className="text-xs text-zinc-500">@{u.username}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!query && (
        <>
          <section className="mb-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              🔥 Trending polls
            </h2>
            <div className="space-y-2">
              {trendingPreview.map(({ p, i, percentA, total }) => (
                <Link
                  key={p.id}
                  href={`/poll/${p.id}`}
                  className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700"
                >
                  <span className="text-lg font-black text-zinc-600">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {p.question}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {total} votes · A {percentA}% ·{" "}
                      <span className="capitalize">{p.category}</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <PeopleLikeYou users={similar} currentUserId={userId} />
        </>
      )}

      <div className="mb-3 flex gap-2 overflow-x-auto">
        {(
          [
            { id: "trending" as const, label: "🔥 Trending" },
            { id: "popular" as const, label: "🌎 Popular" },
            { id: "new" as const, label: "🆕 New" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
              tab === t.id
                ? "bg-violet-600 text-white"
                : "bg-zinc-800 text-zinc-400"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
        Posts & polls
      </h2>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      ) : display.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">Nothing found</p>
      ) : (
        <div className="space-y-4">
          {display.map((item) =>
            item.kind === "poll" ? (
              <PollCard
                key={item.id}
                poll={item.poll}
                currentUserId={userId}
              />
            ) : (
              <PostCard
                key={item.id}
                post={item.post}
                currentUserId={userId}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
