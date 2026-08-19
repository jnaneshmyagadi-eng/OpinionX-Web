import type { Metadata } from "next";
import { HubShell } from "@/components/discovery/hub-shell";
import { fetchTrendingPolls } from "@/lib/polls-public";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "People — What People Are Deciding",
  description:
    "Live OpinionX polls with real vote counts. See the split, vote, and share public opinion.",
  alternates: { canonical: absoluteUrl("/people") },
  openGraph: {
    title: "What People Are Deciding | OpinionX",
    description: "Real votes only. No fake engagement. Vote and share the split.",
    url: absoluteUrl("/people"),
  },
};

export default async function PeoplePage() {
  const polls = await fetchTrendingPolls(16);
  const fetchedAt = new Date().toISOString();
  return (
    <HubShell
      badge="👥 People"
      title="What people are deciding"
      subtitle="This is OpinionX’s unique layer: real two-choice polls, real percentages, real share loops."
      items={[]}
      polls={polls}
      fetchedAt={fetchedAt}
      showNews={false}
    />
  );
}
