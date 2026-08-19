"use client";

import { useState } from "react";
import type { DistributionItem } from "@/lib/daily-engine";

export function DistributionList({ items }: { items: DistributionItem[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied("fail");
    }
  }

  if (items.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="dist-heading">
      <h2
        id="dist-heading"
        className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500"
      >
        Today’s post pack (copy & publish)
      </h2>
      <p className="mb-3 text-xs text-zinc-600">
        Ready-to-post text for X, Instagram and WhatsApp. No bots — you publish
        manually. Links point to real OpinionX pages only.
      </p>
      <ul className="space-y-3">
        {items.map((item, i) => {
          const key = `${item.platform}-${i}`;
          return (
            <li
              key={key}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase text-purple-400">
                  {item.platform} · {item.title}
                </span>
                <button
                  type="button"
                  onClick={() => copy(key, item.body)}
                  className="rounded-full bg-zinc-800 px-3 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700"
                >
                  {copied === key ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-300">
                {item.body}
              </pre>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
