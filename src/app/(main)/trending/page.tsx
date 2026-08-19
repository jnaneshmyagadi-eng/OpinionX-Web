import type { Metadata } from "next";
import Link from "next/link";
import { PeoplePollCard } from "@/components/discovery/people-poll-card";
import { TrendCard } from "@/components/discovery/trend-card";
import { fetchTrends } from "@/lib/trends";
import { fetchTrendingPolls } from "@/lib/polls-public";
import { absoluteUrl } from "@/lib/seo";
import { formatRelativeShort } from "@/lib/trends";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/jsonld";

export const revalidate = 600;

const TITLE = "Trending Opinions and Topics Right Now";
const DESC =
  "Trending world and India headlines plus the hottest OpinionX polls. Discover what people are debating and voting on today.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | OpinionX` },
  description: DESC,
  alternates: { canonical: absoluteUrl("/trending") },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: absoluteUrl("/trending"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
  robots: { index: true, follow: true },
};

export default async function TrendingPage() {
  const [world, india, money, ai, polls] = await Promise.all([
    fetchTrends("world", 4),
    fetchTrends("india", 4),
    fetchTrends("money", 3),
    fetchTrends("ai", 3),
    fetchTrendingPolls(10),
  ]);
  const fetchedAt = new Date().toISOString();
  const headlines = [
    ...world.items,
    ...india.items,
    ...money.items,
    ...ai.items,
  ].slice(0, 12);

  const crumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Trending", path: "/trending" },
  ]);
  const pageLd = webPageJsonLd({
    path: "/trending",
    name: TITLE,
    description: DESC,
    dateModified: fetchedAt,
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
        <p className="text-xs uppercase tracking-wider text-zinc-500">🔥 Trending</p>
        <h1 className="mt-1 text-2xl font-bold text-white">{TITLE}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Headlines from public RSS sources + live OpinionX votes. Updated{" "}
          {formatRelativeShort(fetchedAt) || "just now"}. Poll results are user
          opinions, not facts.
        </p>
        <nav className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link href="/world" className="text-purple-400 hover:underline">
            World
          </Link>
          <Link href="/india" className="text-purple-400 hover:underline">
            India
          </Link>
          <Link href="/money" className="text-purple-400 hover:underline">
            Money
          </Link>
          <Link href="/ai" className="text-purple-400 hover:underline">
            AI
          </Link>
          <Link href="/people" className="text-purple-400 hover:underline">
            People
          </Link>
        </nav>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          What happened (external sources)
        </h2>
        {headlines.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Headlines temporarily unavailable. Scroll to live polls.
          </p>
        ) : (
          <div className="space-y-2">
            {headlines.map((item) => (
              <TrendCard key={item.url + item.title} item={item} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          What people think (OpinionX votes)
        </h2>
        <div className="space-y-3">
          {polls.map((p) => (
            <PeoplePollCard key={p.id} poll={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
