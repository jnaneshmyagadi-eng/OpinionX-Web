"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CATEGORIES, MOODS } from "@/types/database";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CreatePollPage() {
  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [category, setCategory] = useState("general");
  const [mood, setMood] = useState("curious");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (question.trim().length < 5) {
      setError("Question must be at least 5 characters");
      return;
    }
    if (!optionA.trim() || !optionB.trim()) {
      setError("Both options are required");
      return;
    }
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirect=/create");
        return;
      }
      const { data, error } = await supabase
        .from("polls")
        .insert({
          creator_id: user.id,
          question: question.trim(),
          option_a: optionA.trim(),
          option_b: optionB.trim(),
          category,
          mood,
        })
        .select("id")
        .single();
      if (error) throw error;
      router.push(`/poll/${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create poll");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-white">Create a poll</h1>

      <form onSubmit={handlePublish} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="What do you want people to decide?"
            className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            required
          />
          <p className="mt-1 text-right text-xs text-zinc-600">
            {question.length}/300
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Option A</label>
          <input
            value={optionA}
            onChange={(e) => setOptionA(e.target.value)}
            maxLength={100}
            placeholder="First choice"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Option B</label>
          <input
            value={optionB}
            onChange={(e) => setOptionB(e.target.value)}
            maxLength={100}
            placeholder="Second choice"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition",
                  category === c
                    ? "bg-purple-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">Mood</label>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(m)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition",
                  mood === m
                    ? "bg-pink-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {(question || optionA || optionB) && (
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Preview
            </p>
            <p className="mb-3 text-sm font-medium text-white">
              {question || "Your question…"}
            </p>
            <div className="space-y-2">
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-300">
                {optionA || "Option A"}
              </div>
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-sm text-zinc-300">
                {optionB || "Option B"}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Publish poll"
          )}
        </Button>
      </form>
    </div>
  );
}
