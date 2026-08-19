import type { Metadata } from "next";
import { HubShell } from "@/components/discovery/hub-shell";
import { fetchTrends } from "@/lib/trends";
import { fetchLivePolls } from "@/lib/polls-public";
import { absoluteUrl } from "@/lib/seo";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/jsonld";

export const revalidate = 900;

const TITLE = "What Is India Talking About Today?";
const DESC =
  "India trending topics, public debates and OpinionX polls. See headlines from public sources and what people are voting — user opinions, not facts.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | OpinionX` },
  description: DESC,
  alternates: { canonical: absoluteUrl("/india") },
  openGraph: {
    title: "India Is Debating This Right Now 👀",
    description: DESC,
    url: absoluteUrl("/india"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "India Is Debating This Right Now 👀",
    description: DESC,
  },
  robots: { index: true, follow: true },
};

export default async function IndiaPage() {
  const [{ items, fetchedAt, error }, polls] = await Promise.all([
    fetchTrends("india", 10),
    fetchLivePolls(8),
  ]);
  const crumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "India", path: "/india" },
  ]);
  const pageLd = webPageJsonLd({
    path: "/india",
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
        badge="🇮🇳 India"
        title={TITLE}
        subtitle="India headlines from public sources + real OpinionX votes on careers, cities and everyday arguments. Poll results are user votes, not objective facts."
        items={items}
        polls={polls}
        fetchedAt={fetchedAt}
        feedError={error}
      />
    </>
  );
}
