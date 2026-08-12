"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Notification, Profile } from "@/types/database";
import { formatRelativeTime } from "@/lib/utils";
import { Loader2, Heart, MessageCircle, UserPlus, Sparkles } from "lucide-react";
import Link from "next/link";

type NotifWithActor = Notification & {
  actor?: Profile | null;
};

const icons = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  vibe_match: Sparkles,
  vote: Heart,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotifWithActor[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("notifications")
        .select(
          `*, actor:actor_id (id, username, display_name, avatar_url)`
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications(
        (data ?? []).map((n) => ({
          ...n,
          actor: n.actor as Profile | null,
        }))
      );

      // mark all read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="px-3 py-4">
      <h1 className="mb-4 text-xl font-bold text-white">Notifications</h1>
      {notifications.length === 0 ? (
        <p className="py-20 text-center text-zinc-500">No notifications yet</p>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => {
            const Icon = icons[n.type] || Heart;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 rounded-xl px-3 py-3 ${
                  !n.is_read ? "bg-purple-500/5" : ""
                }`}
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                  <Icon className="h-4 w-4 text-pink-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-200">
                    {n.actor && (
                      <Link
                        href={`/profile/${n.actor.username}`}
                        className="font-semibold text-white hover:underline"
                      >
                        {n.actor.display_name || n.actor.username}
                      </Link>
                    )}{" "}
                    {n.message ||
                      (n.type === "like"
                        ? "liked your poll"
                        : n.type === "comment"
                          ? "commented on your poll"
                          : n.type === "follow"
                            ? "started following you"
                            : n.type === "vibe_match"
                              ? "is a vibe match"
                              : "interacted")}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatRelativeTime(n.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
