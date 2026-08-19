import type { Metadata } from "next";
import { HubShell } from "@/components/discovery/hub-shell";
import { fetchTrends } from "@/lib/trends";
import { fetchLivePolls } from "@/lib/polls-public";
import { absoluteUrl } from "@/lib/seo";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/jsonld";

export const revalidate = 900;

const TITLE = "Money Trends and Career Polls";
const DESC =
  "Business headlines and OpinionX polls on jobs, salary and money trade-offs. See what people are deciding about careers and work-life balance.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | OpinionX` },
  description: DESC,
  alternates: { canonical: absoluteUrl("/money") },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: absoluteUrl("/money"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
  robots: { index: true, follow: true },
};

export default async function MoneyPage() {
  const [{ items, fetchedAt, error }, polls] = await Promise.all([
    fetchTrends("money", 10),
    fetchLivePolls(8),
  ]);
  const crumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Money", path: "/money" },
  ]);
  const pageLd = webPageJsonLd({
    path: "/money",
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
        badge="💰 Money"
        title={TITLE}
        subtitle="Business headlines from public sources plus OpinionX debates on jobs and money. Polls reflect votes, not financial advice."
        items={items}
        polls={polls}
        fetchedAt={fetchedAt}
        feedError={error}
      />
    </>
  );
}
