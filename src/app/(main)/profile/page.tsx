"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Poll } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Loader2, Settings } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [savedPolls, setSavedPolls] = useState<Poll[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"created" | "saved">("created");
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

      const { data: saves } = await supabase
        .from("saves")
        .select("poll_id, polls(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const saved = (saves ?? [])
        .map((s) => (s as { polls: Poll | null }).polls)
        .filter(Boolean) as Poll[];
      setSavedPolls(saved);

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

  const list = tab === "created" ? polls : savedPolls;

  return (
    <div className="px-4 py-6">
      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-2xl font-bold text-white">
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
          <div className="mt-3 flex gap-4 text-sm">
            <span>
              <strong className="text-white">{polls.length}</strong>{" "}
              <span className="text-zinc-500">polls</span>
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

      <div className="mt-6 flex border-b border-zinc-800">
        {(["created", "saved"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition ${
              tab === t
                ? "border-b-2 border-purple-500 text-white"
                : "text-zinc-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {list.length === 0 ? (
          <p className="py-10 text-center text-zinc-500">
            {tab === "created" ? "No polls yet" : "No saved polls"}
          </p>
        ) : (
          list.map((p) => (
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
                  {p.vote_count_a + p.vote_count_b} votes · {p.like_count} likes
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
