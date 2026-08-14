import type { Metadata } from "next";
import Link from "next/link";
import { HomeFeed } from "@/components/home/home-feed";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "OpinionX — Everyone Has an Opinion",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: "OpinionX — Everyone Has an Opinion",
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpinionX — Everyone Has an Opinion",
    description: SITE_DESCRIPTION,
  },
};

export default function HomePage() {
  return (
    <div className="px-3 py-4">
      <header className="mb-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-5">
        <h1 className="text-xl font-bold tracking-tight text-white">
          OpinionX — discover what people really think
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          <strong className="text-zinc-200">{SITE_NAME}</strong> is the social
          network for opinions. Ask a two-choice question, vote, see the split,
          and connect with people who think like you.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-zinc-500">
          <li>· ASK → VOTE → DISCOVER → CONNECT</li>
          <li>· Trending opinions with real engagement</li>
          <li>· Find people who vote like you</li>
        </ul>
        <p className="mt-3 text-xs text-zinc-600">
          <Link href="/explore" className="text-purple-400 hover:underline">
            Explore
          </Link>
          {" · "}
          <Link href="/signup" className="text-purple-400 hover:underline">
            Join OpinionX
          </Link>
        </p>
      </header>

      <h2 className="sr-only">Opinion feed</h2>
      <HomeFeed />
    </div>
  );
}
