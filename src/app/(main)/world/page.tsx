import type { Metadata } from "next";
import { HubShell } from "@/components/discovery/hub-shell";
import { fetchTrends } from "@/lib/trends";
import { fetchLivePolls } from "@/lib/polls-public";
import { absoluteUrl } from "@/lib/seo";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/jsonld";

export const revalidate = 900;

const TITLE = "World Trending Topics and Public Opinion";
const DESC =
  "What the world is talking about right now — public headlines plus OpinionX votes. News is what happened; polls are what people think.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | OpinionX` },
  description: DESC,
  alternates: { canonical: absoluteUrl("/world") },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: absoluteUrl("/world"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
  robots: { index: true, follow: true },
};

export default async function WorldPage() {
  const [{ items, fetchedAt, error }, polls] = await Promise.all([
    fetchTrends("world", 10),
    fetchLivePolls(8),
  ]);
  const crumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "World", path: "/world" },
  ]);
  const pageLd = webPageJsonLd({
    path: "/world",
    name: TITLE,
    description: DESC,
    dateModified: fetchedAt,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageLd) }}
      />
      <HubShell
        badge="🌍 World"
        title={TITLE}
        subtitle="Global headlines from public RSS sources, paired with real OpinionX votes."
        items={items}
        polls={polls}
        fetchedAt={fetchedAt}
        feedError={error}
      />
    </>
  );
}
