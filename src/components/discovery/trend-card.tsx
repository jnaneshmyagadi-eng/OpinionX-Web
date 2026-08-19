import type { TrendItem } from "@/lib/trends";
import { formatRelativeShort } from "@/lib/trends";

export function TrendCard({ item }: { item: TrendItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-600"
    >
      <p className="text-sm font-medium leading-snug text-zinc-100">{item.title}</p>
      {item.summary ? (
        <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{item.summary}</p>
      ) : null}
      <p className="mt-2 text-[11px] text-zinc-600">
        {item.source}
        {item.publishedAt ? ` · ${formatRelativeShort(item.publishedAt)}` : ""}
        {" · "}
        <span className="text-zinc-500">Source link</span>
      </p>
    </a>
  );
}
