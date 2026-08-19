import type { Metadata } from "next";
import { HubShell } from "@/components/discovery/hub-shell";
import { fetchTrends } from "@/lib/trends";
import { fetchLivePolls } from "@/lib/polls-public";
import { absoluteUrl } from "@/lib/seo";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/jsonld";

export const revalidate = 900;

const TITLE = "AI Trends and Public Opinion";
const DESC =
  "AI and technology headlines from public sources, plus OpinionX tech polls. See what’s new and what people are voting on.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | OpinionX` },
  description: DESC,
  alternates: { canonical: absoluteUrl("/ai") },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: absoluteUrl("/ai"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
  robots: { index: true, follow: true },
};

export default async function AIHubPage() {
  const [{ items, fetchedAt, error }, polls] = await Promise.all([
    fetchTrends("ai", 10),
    fetchLivePolls(8),
  ]);
  const crumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "AI & Tech", path: "/ai" },
  ]);
  const pageLd = webPageJsonLd({
    path: "/ai",
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
        badge="🤖 AI & Tech"
        title={TITLE}
        subtitle="Technology headlines from public RSS + real OpinionX votes on AI, phones and digital life."
        items={items}
        polls={polls}
        fetchedAt={fetchedAt}
        feedError={error}
      />
    </>
  );
}
