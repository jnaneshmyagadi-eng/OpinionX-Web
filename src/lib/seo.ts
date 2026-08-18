/**
 * Canonical production host for OpinionX.
 * Override with NEXT_PUBLIC_SITE_URL when a custom domain is attached.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://opinionx-web-jnanesh.vercel.app";

export const SITE_NAME = "OpinionX";
export const SITE_TAGLINE = "Online Polls & Public Opinion";

export const SITE_DESCRIPTION =
  "Create polls, vote on questions, and discover what people really think about India, Gen Z, relationships, money, technology, entertainment and more.";

export const SITE_KEYWORDS = [
  "OpinionX",
  "online polls",
  "public opinion",
  "India polls",
  "Gen Z opinions",
  "relationship polls",
  "money polls",
  "AI polls",
  "technology polls",
  "entertainment polls",
  "this or that",
  "social voting",
  "two-choice polls",
];

export function absoluteUrl(path: string = "/") {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${SITE_URL}${path}`;
}

/** SEO-friendly public category hubs backed by real poll.category / mood values. */
export const SEO_CATEGORIES = [
  {
    slug: "trending",
    title: "Trending Polls",
    description:
      "See what India is debating right now. Vote on trending OpinionX polls and share the split.",
    h1: "Trending polls on OpinionX",
    filter: "trending" as const,
  },
  {
    slug: "india",
    title: "India Polls",
    description:
      "Public opinion polls about India — cities, careers, culture, and everyday arguments. Vote and see the split.",
    h1: "India polls & public opinion",
    filter: { mood: "india" } as const,
  },
  {
    slug: "relationships",
    title: "Relationship Polls",
    description:
      "Relationship polls and dating debates. Vote on what people really think about love, breakups, and connections.",
    h1: "Relationship polls",
    filter: { category: "relationships" } as const,
  },
  {
    slug: "career",
    title: "Career & Money Polls",
    description:
      "Career, salary, and money polls — ₹1 crore jobs, work-life balance, startups vs corporate. Let the internet decide.",
    h1: "Career & money polls",
    filter: { category: "career" } as const,
  },
  {
    slug: "tech",
    title: "Technology & AI Polls",
    description:
      "Technology and AI polls — phones, apps, AI tools, and digital life. Vote and compare opinions.",
    h1: "Technology & AI polls",
    filter: { category: "tech" } as const,
  },
  {
    slug: "entertainment",
    title: "Entertainment Polls",
    description:
      "Movies, shows, and entertainment polls. Vote on what people are watching and arguing about.",
    h1: "Entertainment polls",
    filter: { category: "entertainment" } as const,
  },
  {
    slug: "food",
    title: "Food Polls",
    description:
      "Food debates and taste polls — street food, home food, and everyday food arguments.",
    h1: "Food polls",
    filter: { category: "food" } as const,
  },
  {
    slug: "sports",
    title: "Sports Polls",
    description:
      "Sports polls and cricket debates. Vote on teams, players, and match-day opinions.",
    h1: "Sports polls",
    filter: { category: "sports" } as const,
  },
  {
    slug: "lifestyle",
    title: "Lifestyle & Gen Z Polls",
    description:
      "Lifestyle and Gen Z polls — habits, culture, and everyday choices. See what people pick.",
    h1: "Lifestyle & Gen Z polls",
    filter: { category: "lifestyle" } as const,
  },
  {
    slug: "movies",
    title: "Movie Polls",
    description:
      "Movie and cinema polls. Which film wins? Vote and see public opinion.",
    h1: "Movie polls",
    filter: { category: "movies" } as const,
  },
] as const;

export type SeoCategorySlug = (typeof SEO_CATEGORIES)[number]["slug"];

export function getSeoCategory(slug: string) {
  return SEO_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function truncateMeta(text: string, max = 155): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}
