"use client";

import type { CategoryOpinion } from "@/lib/discovery";
import { cn } from "@/lib/utils";

const CATEGORY_EMOJI: Record<string, string> = {
  relationships: "🔥",
  gaming: "🎮",
  food: "🍔",
  tech: "📱",
  fashion: "👗",
  sports: "🏏",
  entertainment: "🎬",
  movies: "🎬",
  music: "🎵",
  lifestyle: "✨",
  career: "💼",
  travel: "✈️",
  general: "💭",
};

interface OpinionGraphProps {
  categories: CategoryOpinion[];
  totalVotes: number;
  compact?: boolean;
}

export function OpinionGraph({
  categories,
  totalVotes,
  compact = false,
}: OpinionGraphProps) {
  if (totalVotes === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
        <p className="text-sm text-zinc-500">
          Vote on polls to build your Opinion Profile
        </p>
      </div>
    );
  }

  const shown = categories.slice(0, compact ? 4 : 8);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">🧠 My Opinion</h3>
        <span className="text-xs text-zinc-500">{totalVotes} votes</span>
      </div>
      <p className="mb-3 text-[11px] text-zinc-600">
        Social preference patterns from your votes — not a personality test.
      </p>
      <div className="space-y-3">
        {shown.map((c) => (
          <div key={c.category}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium capitalize text-zinc-200">
                {CATEGORY_EMOJI[c.category] ?? "•"} {c.category}
              </span>
              <span className="text-zinc-500">{c.total} votes</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="bg-gradient-to-r from-purple-500 to-purple-400"
                style={{ width: `${c.percentA}%` }}
              />
              <div
                className="bg-gradient-to-r from-pink-500 to-orange-400"
                style={{ width: `${c.percentB}%` }}
              />
            </div>
            <div className="mt-0.5 flex justify-between text-[10px] text-zinc-500">
              <span>A {c.percentA}%</span>
              <span>B {c.percentB}%</span>
            </div>
          </div>
        ))}
      </div>
      {categories.length > shown.length && (
        <p className={cn("mt-2 text-center text-[10px] text-zinc-600")}>
          +{categories.length - shown.length} more categories
        </p>
      )}
    </div>
  );
}
