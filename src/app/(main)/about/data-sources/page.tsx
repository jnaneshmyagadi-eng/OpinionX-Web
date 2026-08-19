import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Data Sources",
  description:
    "Where OpinionX trending headlines and poll results come from. Public RSS attribution and real Supabase votes.",
  alternates: { canonical: absoluteUrl("/about/data-sources") },
};

export default function DataSourcesPage() {
  return (
    <article className="mx-auto max-w-lg px-4 py-8 text-sm leading-relaxed text-zinc-300">
      <h1 className="text-2xl font-bold text-white">Data sources</h1>
      <h2 className="mt-6 text-lg font-semibold text-white">Poll results</h2>
      <p className="mt-2">
        All vote percentages on OpinionX come from authenticated votes stored in
        Supabase. Counts are not simulated.
      </p>
      <h2 className="mt-6 text-lg font-semibold text-white">Headlines</h2>
      <p className="mt-2">
        When available, discovery pages fetch public RSS feeds such as BBC News
        topic feeds (World, India, Business, Technology). We show title, short
        summary snippet from the feed, source name, time, and a link to the
        original page.
      </p>
      <p className="mt-2">
        If a feed is down, we hide headlines and still show OpinionX polls — we
        never invent news stories.
      </p>
      <h2 className="mt-6 text-lg font-semibold text-white">Not a news outlet</h2>
      <p className="mt-2">
        OpinionX aggregates links for discovery context. Editorial content
        belongs to the linked publishers.
      </p>
      <p className="mt-8 text-xs text-zinc-600">
        <Link href="/about" className="text-purple-400 hover:underline">
          About
        </Link>
        {" · "}
        <Link href="/" className="text-purple-400 hover:underline">
          Home
        </Link>
      </p>
    </article>
  );
}
