import type { Metadata } from "next";
import { HubShell } from "@/components/discovery/hub-shell";
import { fetchTrends } from "@/lib/trends";
import { fetchLivePolls } from "@/lib/polls-public";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "AI & Tech — What’s New",
  description:
    "Technology and AI headlines from public sources, plus tech opinion polls on OpinionX.",
  alternates: { canonical: absoluteUrl("/ai") },
  openGraph: {
    title: "AI & Tech — What’s New | OpinionX",
    description: "Tech headlines and what people think about AI, phones, and digital life.",
    url: absoluteUrl("/ai"),
  },
  robots: { index: true, follow: true },
};

export default async function AIHubPage() {
  const [{ items, fetchedAt, error }, polls] = await Promise.all([
    fetchTrends("ai", 10),
    fetchLivePolls(8),
  ]);
  return (
    <HubShell
      badge="🤖 AI & Tech"
      title="What’s new"
      subtitle="Technology headlines from public RSS, plus real OpinionX votes on AI, phones and digital life."
      items={items}
      polls={polls}
      fetchedAt={fetchedAt}
      feedError={error}
    />
  );
}
