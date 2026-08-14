"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { startOrOpenChat, type SimilarUser } from "@/lib/discovery";
import { Button } from "@/components/ui/button";

interface PeopleLikeYouProps {
  users: SimilarUser[];
  currentUserId: string | null;
}

export function PeopleLikeYou({
  users,
  currentUserId,
}: PeopleLikeYouProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  if (users.length === 0) return null;

  async function follow(uid: string) {
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    setBusyId(uid);
    try {
      await supabase.from("follows").insert({
        follower_id: currentUserId,
        following_id: uid,
      });
    } catch {
      /* ignore */
    } finally {
      setBusyId(null);
    }
  }

  async function sayHi(uid: string) {
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    setBusyId(uid);
    try {
      const cid = await startOrOpenChat(supabase, currentUserId, uid);
      if (cid) router.push(`/chat/${cid}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
        👥 People Like You
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {users.slice(0, 12).map((u) => (
          <div
            key={u.id}
            className="flex w-36 shrink-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3"
          >
            <Link
              href={`/profile/${u.username}`}
              className="flex flex-col items-center text-center"
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
              <p className="w-full truncate text-xs font-medium text-white">
                @{u.username}
              </p>
              <p className="mt-1 text-[10px] leading-tight text-pink-400">
                Agreed on {u.agreementPercent}% of {u.sharedVotes} shared
                poll{u.sharedVotes !== 1 ? "s" : ""}
              </p>
            </Link>
            <div className="mt-2 flex flex-col gap-1">
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-[10px]"
                disabled={busyId === u.id}
                onClick={() => follow(u.id)}
              >
                Follow
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[10px] text-purple-300"
                disabled={busyId === u.id}
                onClick={() => sayHi(u.id)}
              >
                Say Hi
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
