"use client";

import Link from "next/link";
import { Bell, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function TopBar() {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [initial, setInitial] = useState("U");
  const [unread, setUnread] = useState(0);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();
      if (profile) {
        setAvatar(profile.avatar_url);
        setInitial((profile.username?.[0] ?? "U").toUpperCase());
      }
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnread(count ?? 0);
    }
    load();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight gradient-text">
            OpinionX
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {authed === false ? (
            <Link
              href="/login"
              className="rounded-full bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Log in
            </Link>
          ) : (
            <>
              <Link
                href="/ai-assistant"
                className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-purple-300"
                aria-label="OpinionX AI Assistant"
              >
                <Sparkles className="h-5 w-5" />
              </Link>
              <Link
                href="/notifications"
                className="relative rounded-full p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-pink-500" />
                )}
              </Link>
              <Link
                href="/profile"
                className="ml-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-sm font-semibold text-white"
                aria-label="Profile"
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initial
                )}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
