"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { startOrOpenChat } from "@/lib/discovery";
import type { Profile } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus } from "lucide-react";

interface VoteConnectProps {
  pollId: string;
  choice: "a" | "b";
  optionLabel: string;
  currentUserId: string;
}

export function VoteConnect({
  pollId,
  choice,
  optionLabel,
  currentUserId,
}: VoteConnectProps) {
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: votes } = await supabase
        .from("votes")
        .select("user_id")
        .eq("poll_id", pollId)
        .eq("choice", choice)
        .neq("user_id", currentUserId)
        .limit(12);

      const ids = [...new Set((votes ?? []).map((v) => v.user_id))];
      if (!ids.length) {
        setPeople([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", ids)
        .limit(8);

      setPeople(profiles ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId, choice, currentUserId]);

  async function follow(userId: string) {
    setBusyId(userId);
    try {
      await supabase.from("follows").insert({
        follower_id: currentUserId,
        following_id: userId,
      });
    } catch {
      /* already following or RLS */
    } finally {
      setBusyId(null);
    }
  }

  async function sayHi(userId: string) {
    setBusyId(userId);
    try {
      const cid = await startOrOpenChat(supabase, currentUserId, userId);
      if (cid) router.push(`/chat/${cid}`);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="mt-3 flex justify-center py-2">
        <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (people.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        People who chose {optionLabel}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {people.map((p) => (
          <div
            key={p.id}
            className="flex w-28 shrink-0 flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/70 p-2.5"
          >
            <Link href={`/profile/${p.username}`}>
              <div className="mb-1.5 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-sm font-bold">
                {p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  p.username[0].toUpperCase()
                )}
              </div>
            </Link>
            <p className="w-full truncate text-center text-[11px] font-medium text-white">
              @{p.username}
            </p>
            <div className="mt-1.5 flex w-full flex-col gap-1">
              <Button
                size="sm"
                variant="secondary"
                className="h-6 w-full px-1 text-[10px]"
                disabled={busyId === p.id}
                onClick={() => follow(p.id)}
              >
                <UserPlus className="mr-0.5 h-3 w-3" />
                Follow
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-full px-1 text-[10px] text-purple-300"
                disabled={busyId === p.id}
                onClick={() => sayHi(p.id)}
              >
                Say Hi
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
