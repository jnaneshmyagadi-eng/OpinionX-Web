import type { Metadata } from "next";
import { HubShell } from "@/components/discovery/hub-shell";
import { fetchTrends } from "@/lib/trends";
import { fetchLivePolls } from "@/lib/polls-public";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "India — What Indians Are Talking About",
  description:
    "India-focused headlines and public opinion polls. See what Indians are debating and vote on OpinionX.",
  alternates: { canonical: absoluteUrl("/india") },
  openGraph: {
    title: "India Is Debating This Right Now 👀 | OpinionX",
    description:
      "India headlines and live public opinion. Vote and share the split.",
    url: absoluteUrl("/india"),
  },
};

export default async function IndiaPage() {
  const [{ items, fetchedAt, error }, polls] = await Promise.all([
    fetchTrends("india", 10),
    fetchLivePolls(8),
  ]);
  return (
    <HubShell
      badge="🇮🇳 India"
      title="What Indians are talking about"
      subtitle="India news from public sources + real votes on careers, cities, culture and everyday arguments."
      items={items}
      polls={polls}
      fetchedAt={fetchedAt}
      feedError={error}
    />
  );
}
