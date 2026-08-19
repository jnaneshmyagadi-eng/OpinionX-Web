import type { Metadata } from "next";
import { HubShell } from "@/components/discovery/hub-shell";
import { fetchTrends } from "@/lib/trends";
import { fetchLivePolls } from "@/lib/polls-public";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "World — What’s Exploding Right Now",
  description:
    "World headlines from public sources, plus what people are voting on OpinionX. News tells you what happened — OpinionX tells you what people think.",
  alternates: { canonical: absoluteUrl("/world") },
  openGraph: {
    title: "World — What’s Exploding Right Now | OpinionX",
    description:
      "Global conversations and public opinion. See headlines and vote on OpinionX.",
    url: absoluteUrl("/world"),
  },
};

export default async function WorldPage() {
  const [{ items, fetchedAt, error }, polls] = await Promise.all([
    fetchTrends("world", 10),
    fetchLivePolls(8),
  ]);
  return (
    <HubShell
      badge="🌍 World"
      title="What’s exploding right now"
      subtitle="Global headlines from public sources, paired with real OpinionX votes."
      items={items}
      polls={polls}
      fetchedAt={fetchedAt}
      feedError={error}
    />
  );
}
