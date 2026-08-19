"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Sparkles } from "lucide-react";
import { MOOD_META, MOODS } from "@/types/database";

type Msg = {
  role: "user" | "assistant";
  text: string;
  action?: { label: string; href: string };
};

const STARTERS = [
  "Give me a funny poll idea",
  "What's trending?",
  "Suggest a fashion poll",
  "Help me create a poll",
];

function localReply(input: string): Msg {
  const q = input.toLowerCase();

  if (q.includes("funny") || q.includes("joke")) {
    return {
      role: "assistant",
      text: "Try this funny poll:\n\nWhich is harder?\nA) Waking up early\nB) Going to bed early 😂",
      action: {
        label: "Create this poll",
        href: `/create?q=${encodeURIComponent("Which is harder?")}&a=${encodeURIComponent("Waking up early")}&b=${encodeURIComponent("Going to bed early")}`,
      },
    };
  }
  if (q.includes("fashion") || q.includes("outfit")) {
    return {
      role: "assistant",
      text: "Fashion poll idea:\n\nWhich outfit is better for a night out?\nA) Casual streetwear\nB) Smart formal",
      action: {
        label: "Create this poll",
        href: `/create?q=${encodeURIComponent("Which outfit is better for a night out?")}&a=${encodeURIComponent("Casual streetwear")}&b=${encodeURIComponent("Smart formal")}`,
      },
    };
  }
  if (
    q.includes("tech") ||
    q.includes("phone") ||
    q.includes("iphone") ||
    q.includes("samsung")
  ) {
    return {
      role: "assistant",
      text: "Tech poll:\n\nWhich would you pick?\nA) iPhone\nB) Samsung Galaxy",
      action: {
        label: "Create this poll",
        href: `/create?q=${encodeURIComponent("Which would you pick?")}&a=${encodeURIComponent("iPhone")}&b=${encodeURIComponent("Samsung Galaxy")}`,
      },
    };
  }
  if (q.includes("trending") || q.includes("popular") || q.includes("today")) {
    return {
      role: "assistant",
      text: "Open /trending for headlines + hottest votes, or Home → Trending filter.",
      action: { label: "Open Trending", href: "/trending" },
    };
  }
  if (q.includes("mood") || q.includes("categor")) {
    const list = MOODS.slice(0, 8)
      .map((m) => `${MOOD_META[m].emoji} ${MOOD_META[m].label}`)
      .join(" · ");
    return {
      role: "assistant",
      text: `OpinionX moods:\n${list}`,
    };
  }
  if (q.includes("create") || q.includes("poll idea") || q.includes("suggest")) {
    return {
      role: "assistant",
      text: "Ready-to-post:\n\nCoffee or tea to start the day?\nA) Coffee ☕\nB) Tea 🍵",
      action: {
        label: "Create this poll",
        href: `/create?q=${encodeURIComponent("Coffee or tea to start the day?")}&a=${encodeURIComponent("Coffee")}&b=${encodeURIComponent("Tea")}`,
      },
    };
  }

  return {
    role: "assistant",
    text: "I’m OpinionX AI — poll ideas, moods, and navigation. Try “funny poll” or “what’s trending?”.",
  };
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Hi — I’m OpinionX AI. Ask for poll ideas, moods, or help creating a VS poll.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: content }]);
    setLoading(true);

    try {
      const supabase = createClient();
      if (content.toLowerCase().includes("trending")) {
        const { count } = await supabase
          .from("polls")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);
        const reply = localReply(content);
        if (count != null) {
          reply.text = `There are ${count} active polls right now.\n\n` + reply.text;
        }
        setMessages((m) => [...m, reply]);
        setLoading(false);
        return;
      }
    } catch {
      /* ignore */
    }

    await new Promise((r) => setTimeout(r, 400));
    setMessages((m) => [...m, localReply(content)]);
    setLoading(false);
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
        <Sparkles className="h-5 w-5 text-purple-400" />
        <div>
          <h1 className="text-sm font-semibold text-white">OpinionX AI</h1>
          <p className="text-[10px] text-zinc-500">Poll ideas · moods · discovery</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white"
                  : "bg-zinc-800 text-zinc-100"
              }`}
            >
              {m.text}
              {m.action && (
                <button
                  type="button"
                  onClick={() => router.push(m.action!.href)}
                  className="mt-2 block w-full rounded-xl bg-white/10 px-3 py-2 text-left text-xs font-semibold text-purple-200 hover:bg-white/15"
                >
                  {m.action.label} →
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-zinc-800 px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 overflow-x-auto border-t border-zinc-800 px-3 pt-2">
        {STARTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            className="shrink-0 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-400"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 px-3 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask OpinionX AI…"
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none"
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
