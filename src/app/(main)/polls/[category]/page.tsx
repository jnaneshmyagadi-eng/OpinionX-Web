import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  absoluteUrl,
  getSeoCategory,
  SEO_CATEGORIES,
  SITE_NAME,
} from "@/lib/seo";

export const revalidate = 600;

type Props = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return SEO_CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = getSeoCategory(category);
  if (!cat) return { title: "Category not found", robots: { index: false } };
  const url = absoluteUrl(`/polls/${cat.slug}`);
  return {
    title: cat.title,
    description: cat.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${cat.title} | ${SITE_NAME}`,
      description: cat.description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${cat.title} | ${SITE_NAME}`,
      description: cat.description,
    },
  };
}

export default async function CategoryPollsPage({ params }: Props) {
  const { category } = await params;
  const cat = getSeoCategory(category);
  if (!cat) notFound();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let polls: {
    id: string;
    question: string;
    option_a: string;
    option_b: string;
    vote_count_a: number;
    vote_count_b: number;
    category: string;
    created_at: string;
  }[] = [];

  if (url && key) {
    const supabase = createClient(url, key);
    let query = supabase
      .from("polls")
      .select(
        "id, question, option_a, option_b, vote_count_a, vote_count_b, category, created_at"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(40);

    const f = cat.filter;
    if (f === "trending") {
      query = query.limit(60);
    } else if (typeof f === "object" && f !== null && "category" in f) {
      query = query.eq("category", f.category);
    } else if (typeof f === "object" && f !== null && "mood" in f) {
      query = query.eq("mood", f.mood);
    }

    const { data } = await query;
    polls = data ?? [];

    if (f === "trending") {
      polls = [...polls].sort(
        (a, b) =>
          b.vote_count_a +
          b.vote_count_b -
          (a.vote_count_a + a.vote_count_b)
      );
      polls = polls.slice(0, 40);
    }
  }

  const related = SEO_CATEGORIES.filter((c) => c.slug !== cat.slug).slice(0, 6);

  return (
    <div className="px-4 py-6">
      <nav className="mb-3 text-xs text-zinc-500">
        <Link href="/" className="hover:text-purple-400">
          Home
        </Link>
        {" · "}
        <Link href="/polls" className="hover:text-purple-400">
          Polls
        </Link>
        {" · "}
        <span className="text-zinc-400">{cat.title}</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">{cat.h1}</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          {cat.description}
        </p>
        <p className="mt-3">
          <Link
            href="/create"
            className="inline-flex rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white"
          >
            Create a poll
          </Link>
        </p>
      </header>

      {polls.length === 0 ? (
        <p className="py-12 text-center text-zinc-500">
          No polls in this category yet.{" "}
          <Link href="/create" className="text-purple-400 hover:underline">
            Be the first to ask
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {polls.map((p) => {
            const total = (p.vote_count_a ?? 0) + (p.vote_count_b ?? 0);
            return (
              <li key={p.id}>
                <Link
                  href={`/poll/${p.id}`}
                  className="block rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700"
                >
                  <h2 className="text-base font-semibold text-white">
                    {p.question}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {p.option_a} vs {p.option_b}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {total > 0
                      ? `${total.toLocaleString()} votes`
                      : "Be the first to vote"}
                    {" · "}
                    <span className="capitalize">{p.category}</span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Related categories
        </h2>
        <div className="flex flex-wrap gap-2">
          {related.map((c) => (
            <Link
              key={c.slug}
              href={`/polls/${c.slug}`}
              className="rounded-full bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:text-white"
            >
              {c.title}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
