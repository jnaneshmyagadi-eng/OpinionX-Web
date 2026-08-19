import type { Metadata } from "next";
import { HubShell } from "@/components/discovery/hub-shell";
import { fetchTrendingPolls } from "@/lib/polls-public";
import { absoluteUrl } from "@/lib/seo";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/jsonld";

export const revalidate = 300;

const TITLE = "What Are People Deciding? Live Public Opinion Polls";
const DESC =
  "Live OpinionX polls with real vote counts. See the A/B split, vote, and share. Results are authenticated user votes, not objective facts.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | OpinionX` },
  description: DESC,
  alternates: { canonical: absoluteUrl("/people") },
  openGraph: {
    title: "What People Are Deciding | OpinionX",
    description: DESC,
    url: absoluteUrl("/people"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "What People Are Deciding | OpinionX",
    description: DESC,
  },
  robots: { index: true, follow: true },
};

export default async function PeoplePage() {
  const polls = await fetchTrendingPolls(16);
  const fetchedAt = new Date().toISOString();
  const crumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "People", path: "/people" },
  ]);
  const pageLd = webPageJsonLd({
    path: "/people",
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
        badge="👥 People"
        title={TITLE}
        subtitle="OpinionX’s unique layer: real two-choice polls, real percentages, real share loops. Percentages are user votes only."
        items={[]}
        polls={polls}
        fetchedAt={fetchedAt}
        showNews={false}
      />
    </>
  );
}
