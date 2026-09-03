"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Poll } from "@/types/database";
import type { ContentPost } from "@/types/content";
import { Button } from "@/components/ui/button";
import { OpinionGraph } from "@/components/profile/opinion-graph";
import { buildOpinionGraph, type CategoryOpinion } from "@/lib/discovery";
import { Loader2, Settings } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [savedPolls, setSavedPolls] = useState<Poll[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [voteCount, setVoteCount] = useState(0);
  const [opinionCats, setOpinionCats] = useState<CategoryOpinion[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    "posts" | "polls" | "saved" | "opinion"
  >("posts");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(p);

      const { count: fol } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id);
      setFollowers(fol ?? 0);

      const { count: fing } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id);
      setFollowing(fing ?? 0);

      const { data: created } = await supabase
        .from("polls")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      setPolls(created ?? []);

      const { data: myPosts } = await supabase
        .from("content_posts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setPosts((myPosts as ContentPost[]) ?? []);

      const { data: saves } = await supabase
        .from("saves")
        .select("poll_id, polls(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const saved: Poll[] = [];
      for (const row of saves ?? []) {
        const joined = (row as unknown as { polls: Poll | Poll[] | null })
          .polls;
        if (Array.isArray(joined)) {
          if (joined[0]) saved.push(joined[0]);
        } else if (joined) {
          saved.push(joined);
        }
      }
      setSavedPolls(saved);

      const { data: myVotes } = await supabase
        .from("votes")
        .select("choice, poll_id")
        .eq("user_id", user.id);

      setVoteCount(myVotes?.length ?? 0);

      if (myVotes?.length) {
        const pids = myVotes.map((v) => v.poll_id);
        const { data: votedPolls } = await supabase
          .from("polls")
          .select("id, category")
          .in("id", pids);

        const catById = new Map(
          (votedPolls ?? []).map((vp) => [vp.id, vp.category])
        );
        const rows = myVotes
          .map((v) => ({
            choice: v.choice as "a" | "b",
            category: catById.get(v.poll_id) ?? "general",
          }))
          .filter((r) => r.category);
        const graph = buildOpinionGraph(rows);
        setOpinionCats(graph.categories);
      }

      setLoading(false);
    }
    load();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="px-4 py-6">
      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-600 text-2xl font-bold text-white">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            profile.username[0].toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-white">
            {profile.display_name || profile.username}
          </h1>
          <p className="text-sm text-zinc-500">@{profile.username}</p>
          {profile.bio && (
            <p className="mt-2 text-sm text-zinc-300">{profile.bio}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <span>
              <strong className="text-white">{posts.length}</strong>{" "}
              <span className="text-zinc-500">posts</span>
            </span>
            <span>
              <strong className="text-white">{polls.length}</strong>{" "}
              <span className="text-zinc-500">polls</span>
            </span>
            <span>
              <strong className="text-white">{voteCount}</strong>{" "}
              <span className="text-zinc-500">votes</span>
            </span>
            <span>
              <strong className="text-white">{followers}</strong>{" "}
              <span className="text-zinc-500">followers</span>
            </span>
            <span>
              <strong className="text-white">{following}</strong>{" "}
              <span className="text-zinc-500">following</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Link href="/profile/edit" className="flex-1">
          <Button variant="secondary" size="sm" className="w-full" type="button">
            Edit profile
          </Button>
        </Link>
        <Link href="/settings">
          <Button variant="outline" size="sm" type="button">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="mt-6">
        <OpinionGraph categories={opinionCats} totalVotes={voteCount} compact />
      </div>

      <div className="mt-6 flex border-b border-zinc-800">
        {(
          [
            { id: "posts" as const, label: "Posts" },
            { id: "polls" as const, label: "Polls" },
            { id: "saved" as const, label: "Saved" },
            { id: "opinion" as const, label: "Opinion" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm font-medium transition ${
              tab === t.id
                ? "border-b-2 border-violet-500 text-white"
                : "text-zinc-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "opinion" ? (
        <div className="mt-4">
          <OpinionGraph categories={opinionCats} totalVotes={voteCount} />
        </div>
      ) : tab === "posts" ? (
        <div className="mt-4 space-y-3">
          {posts.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-zinc-500">No posts yet</p>
              <Link
                href="/create/post"
                className="mt-3 inline-block text-sm text-violet-400"
              >
                Create a post
              </Link>
            </div>
          ) : (
            posts.map((p) => (
              <Link
                key={p.id}
                href={`/post/${p.id}`}
                className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700"
              >
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-white">
                    {p.body || (p.type === "image" ? "Photo" : "Post")}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {p.type === "image" ? "Photo" : "Text"} · {p.like_count}{" "}
                    likes · {p.comment_count} comments
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {(tab === "polls" ? polls : savedPolls).length === 0 ? (
            <p className="py-10 text-center text-zinc-500">
              {tab === "polls" ? "No polls yet" : "No saved polls"}
            </p>
          ) : (
            (tab === "polls" ? polls : savedPolls).map((p) => (
              <Link
                key={p.id}
                href={`/poll/${p.id}`}
                className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700"
              >
                {(p.image_a_url || p.image_b_url) && (
                  <div className="flex h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                    {p.image_a_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_a_url}
                        alt=""
                        className="h-full w-1/2 object-cover"
                      />
                    )}
                    {p.image_b_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_b_url}
                        alt=""
                        className="h-full w-1/2 object-cover"
                      />
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {p.question}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {p.vote_count_a + p.vote_count_b} votes · {p.like_count}{" "}
                    likes
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
