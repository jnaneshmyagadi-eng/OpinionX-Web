import type { Metadata } from "next";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Explore Polls & Opinions",
  description:
    "Discover trending, popular, and new OpinionX polls. Search questions, vote, and see what people think.",
  alternates: { canonical: absoluteUrl("/explore") },
  openGraph: {
    title: `Explore Polls & Opinions | ${SITE_NAME}`,
    description:
      "Discover trending and popular polls on OpinionX. Vote and share public opinion.",
    url: absoluteUrl("/explore"),
    type: "website",
  },
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
