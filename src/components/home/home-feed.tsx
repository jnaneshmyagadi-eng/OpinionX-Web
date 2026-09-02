"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PollCard } from "@/components/poll/poll-card";
import { PostCard } from "@/components/post/post-card";
import type { PollWithCreator } from "@/types/database";
import type { ContentPostWithAuthor, FeedItem } from "@/types/content";
import { MOODS, MOOD_META } from "@/types/database";
import { cn } from "@/lib/utils";
import { mergeFeed } from "@/lib/feed";
import { Loader2 } from "lucide-react";

type FeedTab = "for_you" | "following" | "trending" | "new";

export function HomeFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FeedTab>("for_you");
  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      let followingIds: string[] = [];
      if (tab === "following" && user) {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);
        followingIds = (follows ?? []).map((f) => f.following_id);
        if (followingIds.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }
      }

      let pollQuery = supabase
        .from("polls")
        .select(
          `*, profiles:creator_id (id, username, display_name, avatar_url)`
        )
        .eq("is_active", true)
        .limit(30)
        .order("created_at", { ascending: false });

      if (moodFilter) pollQuery = pollQuery.eq("mood", moodFilter);
      if (tab === "following" && followingIds.length) {
        pollQuery = pollQuery.in("creator_id", followingIds);
      }

      let postQuery = supabase
        .from("content_posts")
        .select(
          `*, profiles:user_id (id, username, display_name, avatar_url)`
        )
        .eq("is_active", true)
        .limit(30)
        .order("created_at", { ascending: false });

      if (tab === "following" && followingIds.length) {
        postQuery = postQuery.in("user_id", followingIds);
      }

      const [pollRes, postRes] = await Promise.all([pollQuery, postQuery]);

      let polls: PollWithCreator[] = (pollRes.data ?? []).map((p) => ({
        ...p,
        profiles: p.profiles as PollWithCreator["profiles"],
      }));

      let posts: ContentPostWithAuthor[] = (postRes.data ?? []).map((p) => ({
        ...(p as ContentPostWithAuthor),
        profiles: p.profiles as ContentPostWithAuthor["profiles"],
      }));

      // For You personalization nudge for polls
      if (tab === "for_you" && user) {
        const { data: me } = await supabase
          .from("profiles")
          .select("moods, categories_interest")
          .eq("id", user.id)
          .single();
        const moods = new Set(me?.moods ?? []);
        const cats = new Set(me?.categories_interest ?? []);
        polls = [...polls].sort((a, b) => {
          const score = (p: PollWithCreator) =>
            (moods.has(p.mood) ? 4 : 0) +
            (cats.has(p.category) ? 3 : 0) +
            (p.vote_count_a + p.vote_count_b) * 0.02;
          return score(b) - score(a);
        });
      }

      if (user) {
        const pollIds = polls.map((p) => p.id);
        const postIds = posts.map((p) => p.id);
        const tasks: Promise<void>[] = [];

        if (pollIds.length) {
          tasks.push(
            (async () => {
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
                (votesRes.data ?? []).map((v) => [
                  v.poll_id,
                  v.choice as "a" | "b",
                ])
              );
              const likeSet = new Set(
                (likesRes.data ?? []).map((l) => l.poll_id)
              );
              const saveSet = new Set(
                (savesRes.data ?? []).map((s) => s.poll_id)
              );
              polls = polls.map((p) => ({
                ...p,
                user_vote: voteMap.get(p.id) ?? null,
                user_liked: likeSet.has(p.id),
                user_saved: saveSet.has(p.id),
              }));
            })()
          );
        }

        if (postIds.length) {
          tasks.push(
            (async () => {
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
              const likeSet = new Set(
                (likesRes.data ?? []).map((l) => l.post_id)
              );
              const saveSet = new Set(
                (savesRes.data ?? []).map((s) => s.post_id)
              );
              posts = posts.map((p) => ({
                ...p,
                user_liked: likeSet.has(p.id),
                user_saved: saveSet.has(p.id),
              }));
            })()
          );
        }

        await Promise.all(tasks);
      }

      // Mood filter only applies to polls in mix
      if (moodFilter) {
        posts = [];
      }

      setItems(mergeFeed(polls, posts, tab));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab, moodFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: "for_you" as const, label: "For You" },
            { id: "following" as const, label: "Following" },
            { id: "trending" as const, label: "🔥 Trending" },
            { id: "new" as const, label: "New" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition",
              tab === t.id
                ? "bg-violet-600 text-white"
                : "bg-zinc-800/80 text-zinc-400 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
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
        {MOODS.slice(0, 10).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMoodFilter(m === moodFilter ? null : m)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition",
              moodFilter === m
                ? "bg-zinc-700 text-white ring-1 ring-violet-500"
                : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
            )}
          >
            {MOOD_META[m].emoji} {MOOD_META[m].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20" aria-busy="true">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-12 text-center">
          <p className="text-base font-medium text-zinc-300">
            {tab === "following"
              ? "No posts from people you follow yet"
              : "Nothing here yet"}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {tab === "following"
              ? "Discover creators and follow them to fill this feed."
              : "Share a post or start a poll."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/create/post"
              className="rounded-full bg-zinc-800 px-4 py-2 text-xs font-semibold text-white"
            >
              Create post
            </Link>
            <Link
              href="/create"
              className="rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Create poll
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) =>
            item.kind === "poll" ? (
              <PollCard
                key={item.id}
                poll={item.poll}
                currentUserId={userId}
                onVote={() => load()}
                reel
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
