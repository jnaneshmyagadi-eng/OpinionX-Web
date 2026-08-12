"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Poll } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Settings } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
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
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

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
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          type="button"
          onClick={() => {
            /* Profile edit can be added later */
          }}
        >
          <Settings className="h-4 w-4" /> Edit profile
        </Button>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
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
        {tab === "created" &&
          (polls.length === 0 ? (
            <p className="py-10 text-center text-zinc-500">No polls yet</p>
          ) : (
            polls.map((p) => (
              <Link
                key={p.id}
                href={`/poll/${p.id}`}
                className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700"
              >
                <p className="text-sm font-medium text-white">{p.question}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {p.vote_count_a + p.vote_count_b} votes · {p.like_count} likes
                </p>
              </Link>
            ))
          ))}
        {tab === "saved" && (
          <p className="py-10 text-center text-zinc-500">
            Saved polls appear here
          </p>
        )}
      </div>
    </div>
  );
}
