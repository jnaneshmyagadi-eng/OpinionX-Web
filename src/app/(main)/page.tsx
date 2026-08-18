import type { Metadata } from "next";
import Link from "next/link";
import { HomeFeed } from "@/components/home/home-feed";
import { createClient } from "@/lib/supabase/server";
import {
  absoluteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
  SEO_CATEGORIES,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "OpinionX — Online Polls & Public Opinion",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: "OpinionX — Online Polls & Public Opinion",
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpinionX — Online Polls & Public Opinion",
    description: SITE_DESCRIPTION,
  },
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className={user ? "px-3 pt-2 pb-4" : "px-3 py-4"}>
      {!user && (
        <header className="mb-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-5">
          <h1 className="text-xl font-bold tracking-tight text-white">
            Ask the internet. See what people think.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            <strong className="text-zinc-200">{SITE_NAME}</strong> is where you
            create two-choice polls, vote on real questions, and discover public
            opinion on India, Gen Z life, relationships, money, tech, and more.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-zinc-500">
            <li>· Vote in seconds — see the live split</li>
            <li>· Share results on WhatsApp &amp; X</li>
            <li>· Create your own poll and let the internet decide</li>
          </ul>
          <p className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href="/explore"
              className="rounded-full bg-purple-600 px-4 py-2 font-medium text-white"
            >
              Explore opinions
            </Link>
            <Link
              href="/polls"
              className="rounded-full border border-zinc-600 px-4 py-2 font-medium text-zinc-200"
            >
              Browse categories
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-zinc-600 px-4 py-2 font-medium text-zinc-200"
            >
              Create a poll
            </Link>
          </p>
          <nav
            aria-label="Popular categories"
            className="mt-4 flex flex-wrap gap-2"
          >
            {SEO_CATEGORIES.slice(0, 6).map((c) => (
              <Link
                key={c.slug}
                href={`/polls/${c.slug}`}
                className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:text-white"
              >
                {c.title}
              </Link>
            ))}
          </nav>
        </header>
      )}

      <h2 className="sr-only">Opinion feed</h2>
      <HomeFeed />
    </div>
  );
}
