import type { Metadata } from "next";
import Link from "next/link";
import { HomeFeed } from "@/components/home/home-feed";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 60;

const HOME_DESC =
  "OpinionX — social content + polls. Discover debates, vote, see what people think, and create your own. Let the internet decide.";

export const metadata: Metadata = {
  title: {
    absolute: "OpinionX — Ask. Vote. Discover.",
  },
  description: HOME_DESC,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title: "OpinionX — Ask. Vote. Discover.",
    description: HOME_DESC,
    url: absoluteUrl("/"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpinionX — Ask. Vote. Discover.",
    description: HOME_DESC,
  },
};

export default function HomePage() {
  return (
    <div className="px-3 pb-6 pt-2">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Let the internet decide
        </p>
        <div className="flex gap-2 text-[11px]">
          <Link href="/today" className="text-zinc-500 hover:text-violet-400">
            Today
          </Link>
          <Link href="/trending" className="text-zinc-500 hover:text-violet-400">
            Trending
          </Link>
          <Link href="/people" className="text-zinc-500 hover:text-violet-400">
            People
          </Link>
        </div>
      </div>

      {/* Content-first social feed — polls remain the distinctive unit */}
      <HomeFeed />
    </div>
  );
}
