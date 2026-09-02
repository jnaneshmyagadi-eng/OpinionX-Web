import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { PollsDiscovery } from "@/components/polls/polls-discovery";

export const metadata: Metadata = {
  title: "Polls — Trending debates",
  description:
    "Discover trending OpinionX polls. Vote on India, tech, relationships, career and more. See what people really think.",
  alternates: { canonical: absoluteUrl("/polls") },
  openGraph: {
    title: `Polls | ${SITE_NAME}`,
    description:
      "Trending debates and public opinion polls. Vote, see the split, share.",
    url: absoluteUrl("/polls"),
    type: "website",
  },
};

export default function PollsIndexPage() {
  return (
    <div className="px-3 py-4">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
          Distinctive feature
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">Polls</h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Vote in seconds. See how the internet decides. Discuss and share.
        </p>
        <Link
          href="/create"
          className="mt-3 inline-flex rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white"
        >
          Create a poll
        </Link>
      </header>

      <PollsDiscovery />
    </div>
  );
}
