import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, SEO_CATEGORIES, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Browse Polls by Category",
  description:
    "Explore OpinionX polls by category — India, relationships, career, tech, food, sports, entertainment and more. Vote and see public opinion.",
  alternates: { canonical: absoluteUrl("/polls") },
  openGraph: {
    title: `Browse Polls by Category | ${SITE_NAME}`,
    description:
      "Explore OpinionX polls by category. Vote on questions and discover what people really think.",
    url: absoluteUrl("/polls"),
    type: "website",
  },
};

export default function PollsIndexPage() {
  return (
    <div className="px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Poll categories</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Browse public OpinionX polls by topic. Vote, see the split, and share
          results with friends.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {SEO_CATEGORIES.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/polls/${c.slug}`}
              className="block rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-purple-500/40"
            >
              <h2 className="text-base font-semibold text-white">{c.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                {c.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-center text-sm text-zinc-500">
        <Link href="/explore" className="text-purple-400 hover:underline">
          Explore all polls
        </Link>
        {" · "}
        <Link href="/create" className="text-purple-400 hover:underline">
          Create a poll
        </Link>
      </p>
    </div>
  );
}
