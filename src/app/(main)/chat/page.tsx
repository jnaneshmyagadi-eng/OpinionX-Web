"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";

interface ConvPreview {
  id: string;
  updated_at: string;
  other: { id: string; username: string; display_name: string | null; avatar_url: string | null };
  last_message?: string;
  unread?: number;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<ConvPreview[]>([]);
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

      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id);

      if (!memberships?.length) {
        setLoading(false);
        return;
      }

      const convIds = memberships.map((m) => m.conversation_id);

      const previews: ConvPreview[] = [];
      for (const cid of convIds) {
        const { data: members } = await supabase
          .from("conversation_members")
          .select("user_id, profiles:user_id (id, username, display_name, avatar_url)")
          .eq("conversation_id", cid)
          .neq("user_id", user.id);

        const other = members?.[0]?.profiles as ConvPreview["other"] | undefined;
        if (!other) continue;

        const { data: msgs } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", cid)
          .order("created_at", { ascending: false })
          .limit(1);

        const { data: conv } = await supabase
          .from("conversations")
          .select("updated_at")
          .eq("id", cid)
          .single();

        previews.push({
          id: cid,
          updated_at: conv?.updated_at ?? "",
          other,
          last_message: msgs?.[0]?.content,
        });
      }

      setConversations(
        previews.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
      );
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
      <h1 className="mb-4 text-xl font-bold text-white">Messages</h1>
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <MessageCircle className="mb-3 h-12 w-12 text-zinc-700" />
          <p className="text-zinc-500">No conversations yet</p>
          <p className="mt-1 text-sm text-zinc-600">
            Match vibes on Explore and say hi
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/chat/${c.id}`}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-zinc-900"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-600 to-pink-500 font-bold">
                {c.other.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.other.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  c.other.username[0].toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate font-medium text-white">
                    {c.other.display_name || c.other.username}
                  </p>
                  <span className="text-xs text-zinc-500">
                    {formatRelativeTime(c.updated_at)}
                  </span>
                </div>
                <p className="truncate text-sm text-zinc-500">
                  {c.last_message || "Say hello"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
