import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HomeFeed } from "@/components/home/home-feed";
import { PeoplePollCard } from "@/components/discovery/people-poll-card";
import { TrendCard } from "@/components/discovery/trend-card";
import { buildDailyBrief } from "@/lib/daily-engine";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { formatRelativeShort } from "@/lib/trends";

export const revalidate = 600;

const HOME_DESC =
  "Daily discovery: what happened in the world and India, plus what people are deciding on OpinionX with real votes.";

export const metadata: Metadata = {
  title: {
    absolute: "OpinionX — What the Internet Is Talking About Right Now",
  },
  description: HOME_DESC,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title: "OpinionX — What the Internet Is Talking About Right Now",
    description: HOME_DESC,
    url: absoluteUrl("/"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpinionX — What the Internet Is Talking About Right Now",
    description: HOME_DESC,
  },
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const brief = await buildDailyBrief();
  const polls = brief.topPolls;

  return (
    <div className="px-3 pb-4 pt-2">
      <header className="mb-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">
          {SITE_NAME}
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
          What the Internet is talking about right now.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          News tells you what happened. OpinionX tells you what people think —
          with real votes only.
        </p>
        <p className="mt-2 text-[11px] text-zinc-600">
          Daily brief {brief.dateKey} · Updated{" "}
          {formatRelativeShort(brief.fetchedAt) || "just now"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/today"
            className="rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white"
          >
            Today’s brief
          </Link>
          <Link
            href="/people"
            className="rounded-full border border-zinc-600 px-4 py-2 text-xs font-semibold text-zinc-200"
          >
            What people decide
          </Link>
          <Link
            href="/trending"
            className="rounded-full border border-zinc-700 px-4 py-2 text-xs text-zinc-400"
          >
            Trending
          </Link>
        </div>
      </header>

      <nav
        aria-label="Topics"
        className="mb-6 flex gap-1.5 overflow-x-auto pb-1"
      >
        {[
          { href: "/today", label: "📅 Today" },
          { href: "/world", label: "🌍 World" },
          { href: "/india", label: "🇮🇳 India" },
          { href: "/money", label: "💰 Money" },
          { href: "/ai", label: "🤖 AI" },
          { href: "/people", label: "👥 People" },
          { href: "/trending", label: "🔥 Trending" },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="shrink-0 rounded-full bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white"
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <section className="mb-8" aria-labelledby="people-home">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="people-home" className="text-sm font-semibold text-white">
            👥 People — strongest debates right now
          </h2>
          <Link href="/today" className="text-xs text-purple-400 hover:underline">
            Full brief
          </Link>
        </div>
        {polls.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No polls yet.{" "}
            <Link href="/create" className="text-purple-400">
              Create one
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            {polls.slice(0, 4).map((p) => (
              <PeoplePollCard key={p.id} poll={p} />
            ))}
          </div>
        )}
      </section>

      <Section
        id="india"
        title="🇮🇳 India — what happened"
        subtitle="Headlines from public sources"
        href="/india"
        items={brief.headlines.india.slice(0, 3)}
      />
      <Section
        id="world"
        title="🌍 World — what happened"
        subtitle="Global headlines"
        href="/world"
        items={brief.headlines.world.slice(0, 3)}
      />
      <Section
        id="money"
        title="💰 Money"
        subtitle="What's moving"
        href="/money"
        items={brief.headlines.money.slice(0, 2)}
      />
      <Section
        id="ai"
        title="🤖 AI & Tech"
        subtitle="What's new"
        href="/ai"
        items={brief.headlines.ai.slice(0, 2)}
      />

      <section className="mb-6 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-4">
        <h2 className="text-sm font-semibold text-white">Publish today’s debate</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Open the daily brief for suggested A/B questions tied to headlines,
          then publish with your account (no auto-votes).
        </p>
        <Link
          href="/today"
          className="mt-2 inline-block text-xs text-purple-400 hover:underline"
        >
          Open /today →
        </Link>
      </section>

      {user && (
        <>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Your feed
          </h2>
          <HomeFeed />
        </>
      )}

      {!user && (
        <p className="mt-6 text-center text-xs text-zinc-600">
          <Link href="/about" className="text-purple-400 hover:underline">
            About
          </Link>
          {" · "}
          <Link
            href="/about/data-sources"
            className="text-purple-400 hover:underline"
          >
            Data sources
          </Link>
          {" · "}
          <Link href="/signup" className="text-purple-400 hover:underline">
            Create a poll
          </Link>
        </p>
      )}
    </div>
  );
}

function Section({
  id,
  title,
  subtitle,
  href,
  items,
}: {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  items: {
    title: string;
    url: string;
    source: string;
    publishedAt: string | null;
    summary: string;
    category: string;
  }[];
}) {
  return (
    <section className="mb-8" aria-labelledby={id}>
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h2 id={id} className="text-sm font-semibold text-white">
            {title}
          </h2>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
        <Link href={href} className="shrink-0 text-xs text-purple-400 hover:underline">
          Open
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-600">
          Headlines unavailable —{" "}
          <Link href="/people" className="text-purple-400">
            see polls
          </Link>
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <TrendCard key={item.url + item.title} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
