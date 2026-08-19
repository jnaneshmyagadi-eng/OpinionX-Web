import Link from "next/link";
import { TrendCard } from "@/components/discovery/trend-card";
import { PeoplePollCard } from "@/components/discovery/people-poll-card";
import type { TrendItem } from "@/lib/trends";
import type { PublicPollCard } from "@/lib/polls-public";
import { formatRelativeShort } from "@/lib/trends";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/world", label: "World" },
  { href: "/india", label: "India" },
  { href: "/money", label: "Money" },
  { href: "/ai", label: "AI" },
  { href: "/people", label: "People" },
  { href: "/trending", label: "Trending" },
] as const;

type Props = {
  title: string;
  subtitle: string;
  badge: string;
  items: TrendItem[];
  polls: PublicPollCard[];
  fetchedAt: string;
  feedError?: string;
  showNews?: boolean;
};

export function HubShell({
  title,
  subtitle,
  badge,
  items,
  polls,
  fetchedAt,
  feedError,
  showNews = true,
}: Props) {
  return (
    <div className="px-3 py-4">
      <nav
        aria-label="Discovery"
        className="mb-4 flex gap-1.5 overflow-x-auto pb-1"
      >
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="shrink-0 rounded-full bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white"
          >
            {n.label}
          </Link>
        ))}
      </nav>

      <header className="mb-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {badge}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{subtitle}</p>
        <p className="mt-2 text-[11px] text-zinc-600">
          Updated {formatRelativeShort(fetchedAt) || "just now"}
          {" · "}
          News = what happened · OpinionX = what people think
        </p>
      </header>

      {showNews && (
        <section className="mb-8" aria-labelledby="headlines-heading">
          <h2
            id="headlines-heading"
            className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500"
          >
            Headlines (external sources)
          </h2>
          {feedError && items.length === 0 ? (
            <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-500">
              {feedError}. Showing OpinionX polls below instead.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <TrendCard key={item.url + item.title} item={item} />
              ))}
            </div>
          )}
          <p className="mt-2 text-[10px] text-zinc-600">
            Headlines link to original publishers. OpinionX does not republish
            full articles.
          </p>
        </section>
      )}

      <section aria-labelledby="people-heading">
        <h2
          id="people-heading"
          className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500"
        >
          👥 What people are deciding
        </h2>
        {polls.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No polls yet.{" "}
            <Link href="/create" className="text-purple-400 hover:underline">
              Create one
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            {polls.map((p) => (
              <PeoplePollCard key={p.id} poll={p} />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-10 space-y-3 border-t border-zinc-800 pt-6 text-center text-sm">
        <p className="text-zinc-500">Keep exploring</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            href="/trending"
            className="rounded-full bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300"
          >
            Trending
          </Link>
          <Link
            href="/people"
            className="rounded-full bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300"
          >
            People
          </Link>
          <Link
            href="/explore"
            className="rounded-full bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300"
          >
            Explore
          </Link>
          <Link
            href="/about"
            className="rounded-full bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300"
          >
            About
          </Link>
        </div>
      </footer>
    </div>
  );
}
