import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Explore polls & people",
  description:
    "Explore trending polls, new votes, mood categories, and people with similar opinions on OpinionX — the social voting platform for two-choice polls.",
  alternates: {
    canonical: absoluteUrl("/explore"),
  },
  openGraph: {
    title: "Explore polls & people | OpinionX",
    description:
      "Discover trending two-choice polls, vote on what people think, and find vibe matches on OpinionX.",
    url: absoluteUrl("/explore"),
  },
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
