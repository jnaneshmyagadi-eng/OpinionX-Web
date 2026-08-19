import Link from "next/link";
import type { SuggestedDebate } from "@/lib/daily-engine";

export function SuggestedDebateCard({ item }: { item: SuggestedDebate }) {
  return (
    <article className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-4">
      <p className="text-[10px] uppercase tracking-wider text-zinc-600">
        Suggested debate · not published yet · 0 votes
      </p>
      <h3 className="mt-1 text-sm font-semibold text-white">{item.question}</h3>
      <p className="mt-1 text-xs text-zinc-400">
        {item.optionA} vs {item.optionB}
      </p>
      <p className="mt-2 text-[11px] text-zinc-600">
        Inspired by headline (external):{" "}
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 underline hover:text-purple-400"
        >
          {item.basedOnTitle}
        </a>{" "}
        · {item.sourceName}
      </p>
      <div className="mt-3 flex gap-2">
        <Link
          href={item.createPath}
          className="flex-1 rounded-full bg-zinc-100 py-2 text-center text-xs font-semibold text-zinc-900"
        >
          Publish this poll
        </Link>
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-full border border-zinc-600 py-2 text-center text-xs text-zinc-300"
        >
          Read source
        </a>
      </div>
    </article>
  );
}
