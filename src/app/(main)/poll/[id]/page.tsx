import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { PollDetailClient } from "./poll-detail-client";
import {
  absoluteUrl,
  SITE_NAME,
  SITE_URL,
  truncateMeta,
  getSeoCategory,
  SEO_CATEGORIES,
} from "@/lib/seo";

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

function publicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function fetchPoll(id: string) {
  const supabase = publicSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("polls")
    .select(
      `id, question, option_a, option_b, category, mood, vote_count_a, vote_count_b, like_count, comment_count, is_active, created_at, updated_at, image_a_url, image_b_url, creator_id, profiles:creator_id (id, username, display_name, avatar_url)`
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const poll = await fetchPoll(id);

  if (!poll) {
    return {
      title: "Poll not found",
      robots: { index: false, follow: false },
    };
  }

  const total = (poll.vote_count_a ?? 0) + (poll.vote_count_b ?? 0);
  const title = truncateMeta(
    `${poll.question} — What Would You Choose?`,
    60
  );
  const description = truncateMeta(
    total > 0
      ? `Vote on OpinionX: ${poll.option_a} vs ${poll.option_b}. ${total.toLocaleString()} votes so far. See what people think.`
      : `Vote on OpinionX: ${poll.option_a} vs ${poll.option_b}. Join the conversation and share your opinion.`
  );
  const url = absoluteUrl(`/poll/${id}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: poll.question,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: poll.question,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function PollPage({ params }: Props) {
  const { id } = await params;
  const poll = await fetchPoll(id);
  if (!poll) notFound();

  const supabase = publicSupabase();
  let related: {
    id: string;
    question: string;
    option_a: string;
    option_b: string;
    vote_count_a: number;
    vote_count_b: number;
    category: string;
  }[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("polls")
      .select(
        "id, question, option_a, option_b, vote_count_a, vote_count_b, category"
      )
      .eq("is_active", true)
      .eq("category", poll.category)
      .neq("id", id)
      .order("created_at", { ascending: false })
      .limit(6);
    related = data ?? [];
  }

  const total = (poll.vote_count_a ?? 0) + (poll.vote_count_b ?? 0);
  const categorySlug =
    SEO_CATEGORIES.find(
      (c) =>
        "category" in c.filter &&
        c.filter.category === poll.category
    )?.slug ?? null;
  const categoryHref = categorySlug
    ? `/polls/${categorySlug}`
    : `/polls`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: poll.question,
      text: poll.question,
      answerCount: total,
      dateCreated: poll.created_at,
      author: {
        "@type": "Person",
        name:
          (poll.profiles as { display_name?: string; username?: string } | null)
            ?.display_name ||
          (poll.profiles as { username?: string } | null)?.username ||
          "OpinionX user",
      },
      suggestedAnswer: [
        {
          "@type": "Answer",
          text: poll.option_a,
          upvoteCount: poll.vote_count_a ?? 0,
        },
        {
          "@type": "Answer",
          text: poll.option_b,
          upvoteCount: poll.vote_count_b ?? 0,
        },
      ],
    },
    url: absoluteUrl(`/poll/${id}`),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <div className="px-3 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Crawlable summary — interactive vote UI is client-side */}
      <header className="mb-3">
        <p className="mb-1 text-xs text-zinc-500">
          <Link href="/polls" className="hover:text-purple-400">
            Polls
          </Link>
          {" · "}
          <Link
            href={categoryHref}
            className="capitalize hover:text-purple-400"
          >
            {poll.category}
          </Link>
        </p>
        <h1 className="text-lg font-bold leading-snug text-white">
          {poll.question}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {poll.option_a} vs {poll.option_b}
          {total > 0 && (
            <>
              {" · "}
              {total.toLocaleString()} votes
            </>
          )}
        </p>
      </header>

      <PollDetailClient pollId={id} />

      {related.length > 0 && (
        <section className="mt-8" aria-labelledby="related-heading">
          <h2
            id="related-heading"
            className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500"
          >
            Related polls
          </h2>
          <ul className="space-y-2">
            {related.map((r) => {
              const t = (r.vote_count_a ?? 0) + (r.vote_count_b ?? 0);
              return (
                <li key={r.id}>
                  <Link
                    href={`/poll/${r.id}`}
                    className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-700"
                  >
                    <p className="text-sm font-medium text-white">
                      {r.question}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {r.option_a} vs {r.option_b}
                      {t > 0 && <> · {t.toLocaleString()} votes</>}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-center">
        <p className="text-sm text-zinc-300">
          Have a question? Let the internet decide.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Link
            href="/create"
            className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white"
          >
            Create your own poll
          </Link>
          <Link
            href="/explore"
            className="rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-200"
          >
            Explore more
          </Link>
          <Link
            href="/polls"
            className="rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-200"
          >
            All categories
          </Link>
        </div>
      </section>
    </div>
  );
}
