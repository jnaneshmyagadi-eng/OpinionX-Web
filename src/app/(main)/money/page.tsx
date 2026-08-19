import type { Metadata } from "next";
import { HubShell } from "@/components/discovery/hub-shell";
import { fetchTrends } from "@/lib/trends";
import { fetchLivePolls } from "@/lib/polls-public";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Money — What’s Moving",
  description:
    "Business and money headlines plus career and salary opinion polls on OpinionX.",
  alternates: { canonical: absoluteUrl("/money") },
  openGraph: {
    title: "Money — What’s Moving | OpinionX",
    description: "Markets, careers, and what people choose when money is on the line.",
    url: absoluteUrl("/money"),
  },
};

export default async function MoneyPage() {
  const [{ items, fetchedAt, error }, polls] = await Promise.all([
    fetchTrends("money", 10),
    fetchLivePolls(8),
  ]);
  return (
    <HubShell
      badge="💰 Money"
      title="What’s moving"
      subtitle="Business headlines from public sources, plus OpinionX debates on jobs, salary and trade-offs."
      items={items}
      polls={polls}
      fetchedAt={fetchedAt}
      feedError={error}
    />
  );
}
