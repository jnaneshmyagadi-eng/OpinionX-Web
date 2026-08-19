import type { Metadata } from "next";
import Link from "next/link";
import { buildDailyBrief } from "@/lib/daily-engine";
import { PeoplePollCard } from "@/components/discovery/people-poll-card";
import { TrendCard } from "@/components/discovery/trend-card";
import { SuggestedDebateCard } from "@/components/discovery/suggested-debate-card";
import { DistributionList } from "@/components/discovery/distribution-list";
import { absoluteUrl } from "@/lib/seo";
import { formatRelativeShort } from "@/lib/trends";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/jsonld";
import { percentSplit } from "@/lib/polls-public";

export const revalidate = 600;

const TITLE = "What Is India Talking About Today?";
const DESC =
  "Daily OpinionX brief: sourced headlines (what happened) plus live polls with real votes (what people think). No fake engagement.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | OpinionX` },
  description: DESC,
  alternates: { canonical: absoluteUrl("/today") },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: absoluteUrl("/today"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
  robots: { index: true, follow: true },
};

export default async function TodayPage() {
  const brief = await buildDailyBrief();
  const crumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Today", path: "/today" },
  ]);
  const pageLd = webPageJsonLd({
    path: "/today",
    name: TITLE,
    description: DESC,
    dateModified: brief.fetchedAt,
  });

  return (
    <div className="px-3 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageLd) }}
      />

      <header className="mb-5">
        <p className="text-xs uppercase tracking-wider text-purple-400">
          Daily brief · {brief.dateKey}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">{TITLE}</h1>
        <p className="mt-2 text-sm text-zinc-400">{DESC}</p>
        <p className="mt-2 text-[11px] text-zinc-600">
          Updated {formatRelativeShort(brief.fetchedAt) || "just now"}
          {" · "}News = external sources · Polls = authenticated user votes only
        </p>
        <nav className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link href="/india" className="text-purple-400 hover:underline">
            India
          </Link>
          <Link href="/world" className="text-purple-400 hover:underline">
            World
          </Link>
          <Link href="/people" className="text-purple-400 hover:underline">
            People
          </Link>
          <Link href="/trending" className="text-purple-400 hover:underline">
            Trending
          </Link>
        </nav>
      </header>

      {/* LIVE DEBATES FIRST */}
      <section className="mb-8" aria-labelledby="live-debates">
        <h2
          id="live-debates"
          className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500"
        >
          What people are deciding (live polls)
        </h2>
        {brief.liveDebates.length === 0 && brief.topPolls.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No live polls yet.{" "}
            <Link href="/create" className="text-purple-400">
              Create the first one
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            {(brief.liveDebates.length > 0
              ? brief.liveDebates.map((d) => d.poll)
              : brief.topPolls
            )
              .slice(0, 6)
              .map((p) => (
                <div key={p.id}>
                  <PeoplePollCard poll={p} />
                  {brief.liveDebates
                    .find((d) => d.poll.id === p.id)
                    ?.relatedHeadlines.slice(0, 1)
                    .map((h) => (
                      <p
                        key={h.url}
                        className="mt-1 px-1 text-[11px] text-zinc-600"
                      >
                        Related headline:{" "}
                        <a
                          href={h.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-purple-400"
                        >
                          {h.title}
                        </a>{" "}
                        ({h.source})
                      </p>
                    ))}
                </div>
              ))}
          </div>
        )}
      </section>

      {/* WHAT HAPPENED */}
      <section className="mb-8" aria-labelledby="what-happened">
        <h2
          id="what-happened"
          className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500"
        >
          What happened (external headlines)
        </h2>
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-medium text-zinc-400">🇮🇳 India</h3>
          <div className="space-y-2">
            {brief.headlines.india.slice(0, 4).map((item) => (
              <TrendCard key={item.url + item.title} item={item} />
            ))}
          </div>
        </div>
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-medium text-zinc-400">🌍 World</h3>
          <div className="space-y-2">
            {brief.headlines.world.slice(0, 3).map((item) => (
              <TrendCard key={item.url + item.title} item={item} />
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-medium text-zinc-400">💰 Money</h3>
            <div className="space-y-2">
              {brief.headlines.money.slice(0, 2).map((item) => (
                <TrendCard key={item.url + item.title} item={item} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-zinc-400">🤖 AI & Tech</h3>
            <div className="space-y-2">
              {brief.headlines.ai.slice(0, 2).map((item) => (
                <TrendCard key={item.url + item.title} item={item} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SUGGESTED — publish path */}
      <section className="mb-8" aria-labelledby="suggested">
        <h2
          id="suggested"
          className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500"
        >
          Debate opportunities (publish to make them live)
        </h2>
        <p className="mb-3 text-xs text-zinc-600">
          These are prompts only. Publishing requires your logged-in account.
          No automatic votes are created.
        </p>
        <div className="space-y-3">
          {brief.suggestions.map((s) => (
            <SuggestedDebateCard key={s.question + s.sourceUrl} item={s} />
          ))}
        </div>
      </section>

      {/* Snapshot metrics for founder (honest, client-visible from data) */}
      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-white">Today snapshot</h2>
        <ul className="mt-2 space-y-1 text-xs text-zinc-400">
          <li>Date: {brief.dateKey}</li>
          <li>
            Headlines loaded:{" "}
            {brief.headlines.india.length +
              brief.headlines.world.length +
              brief.headlines.money.length +
              brief.headlines.ai.length}
          </li>
          <li>Live polls shown: {brief.topPolls.length}</li>
          <li>
            Total real votes on top polls:{" "}
            {brief.topPolls.reduce(
              (n, p) => n + p.vote_count_a + p.vote_count_b,
              0
            )}
          </li>
          <li>
            Strongest poll:{" "}
            {brief.topPolls[0]
              ? (() => {
                  const p = brief.topPolls[0];
                  const { percentA, percentB, total } = percentSplit(
                    p.vote_count_a,
                    p.vote_count_b
                  );
                  return total > 0
                    ? `${p.question.slice(0, 48)}… (${percentA}/${percentB}, ${total} votes)`
                    : p.question.slice(0, 60);
                })()
              : "—"}
          </li>
          {brief.errors.length > 0 && (
            <li className="text-amber-600">Feed notes: {brief.errors.join("; ")}</li>
          )}
        </ul>
        <p className="mt-2 text-[10px] text-zinc-600">
          Visitors, signups and shares require your analytics (Vercel Analytics /
          Search Console / Supabase). This page never invents those numbers.
        </p>
      </section>

      <DistributionList items={brief.distribution} />
    </div>
  );
}
