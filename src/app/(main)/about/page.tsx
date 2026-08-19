import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About OpinionX",
  description:
    "OpinionX is a social voting platform. News tells you what happened — OpinionX tells you what people think.",
  alternates: { canonical: absoluteUrl("/about") },
};

export default function AboutPage() {
  return (
    <article className="prose-invert mx-auto max-w-lg px-4 py-8 text-sm leading-relaxed text-zinc-300">
      <h1 className="text-2xl font-bold text-white">About {SITE_NAME}</h1>
      <p className="mt-4">
        <strong className="text-white">News tells you what happened.</strong>
        <br />
        <strong className="text-white">OpinionX tells you what people think.</strong>
      </p>
      <p className="mt-4">
        OpinionX is a two-choice social voting product. Anyone can open a public
        poll, see live results after votes exist, and share the split. Accounts
        are required to cast a vote so results stay tied to real users under
        Supabase authentication and row-level security.
      </p>
      <h2 className="mt-8 text-lg font-semibold text-white">How voting works</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Each signed-in user can vote once per poll (A or B).</li>
        <li>Percentages are calculated from real vote counts only.</li>
        <li>We do not invent votes, likes, or engagement.</li>
      </ul>
      <h2 className="mt-8 text-lg font-semibold text-white">Trending information</h2>
      <p className="mt-2">
        Discovery hubs may show headlines from public RSS feeds (for example BBC
        News). Those items always link to the original publisher. OpinionX is
        not a news publisher and does not copy full articles.
      </p>
      <p className="mt-4">
        <Link href="/about/data-sources" className="text-purple-400 hover:underline">
          Data sources →
        </Link>
      </p>
      <p className="mt-8 text-xs text-zinc-600">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        {" · "}
        <Link href="/people" className="hover:underline">
          People
        </Link>
        {" · "}
        <Link href="/trending" className="hover:underline">
          Trending
        </Link>
      </p>
    </article>
  );
}
