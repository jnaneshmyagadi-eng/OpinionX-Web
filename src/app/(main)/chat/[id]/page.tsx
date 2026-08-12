"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Message, Profile } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Loader2, Send, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";

type MessageWithSender = Message & { sender?: Profile | null };

export default function ChatRoomPage() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [content, setContent] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const { data } = await supabase
        .from("messages")
        .select(`*, sender:sender_id (id, username, display_name, avatar_url)`)
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      const rows = (data ?? []) as unknown as Array<
        Message & { sender: Profile | null }
      >;
      setMessages(
        rows.map((m) => ({
          id: m.id,
          conversation_id: m.conversation_id,
          sender_id: m.sender_id,
          content: m.content,
          created_at: m.created_at,
          sender: m.sender ?? null,
        }))
      );
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`chat:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        async (payload) => {
          const row = payload.new as Message;
          const { data: sender } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", row.sender_id)
            .single();
          setMessages((prev) => [...prev, { ...row, sender: sender ?? null }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !content.trim()) return;
    setSending(true);
    try {
      await supabase.from("messages").insert({
        conversation_id: id,
        sender_id: userId,
        content: content.trim(),
      });
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", id);
      setContent("");
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-zinc-800 px-3 py-3">
        <Link href="/chat" className="rounded-full p-1.5 hover:bg-zinc-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-medium text-white">Chat</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {messages.map((m) => {
          const isMe = m.sender_id === userId;
          return (
            <div
              key={m.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                  isMe
                    ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white"
                    : "bg-zinc-800 text-zinc-100"
                }`}
              >
                <p className="text-sm">{m.content}</p>
                <p
                  className={`mt-0.5 text-[10px] ${
                    isMe ? "text-white/70" : "text-zinc-500"
                  }`}
                >
                  {formatRelativeTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="flex gap-2 border-t border-zinc-800 px-3 py-3"
      >
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Message…"
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none"
        />
        <Button type="submit" size="icon" disabled={sending || !content.trim()}>
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
