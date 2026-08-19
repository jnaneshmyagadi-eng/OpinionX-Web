/**
 * Legitimate public RSS feeds for discovery hubs.
 * Titles + links + pub dates only — never full article copies.
 */

export type TrendItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
  summary: string;
  category: string;
};

export type TrendCategory = "world" | "india" | "money" | "ai";

const FEEDS: Record<
  TrendCategory,
  { url: string; source: string; category: string }[]
> = {
  world: [
    {
      url: "https://feeds.bbci.co.uk/news/world/rss.xml",
      source: "BBC News",
      category: "world",
    },
  ],
  india: [
    {
      url: "https://feeds.bbci.co.uk/news/world/asia/india/rss.xml",
      source: "BBC News",
      category: "india",
    },
  ],
  money: [
    {
      url: "https://feeds.bbci.co.uk/news/business/rss.xml",
      source: "BBC News",
      category: "money",
    },
  ],
  ai: [
    {
      url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
      source: "BBC News",
      category: "ai",
    },
  ],
};

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRssItems(
  xml: string,
  source: string,
  category: string,
  limit: number
): TrendItem[] {
  const items: TrendItem[] = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const block of blocks) {
    if (items.length >= limit) break;
    const titleMatch =
      block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ||
      block.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch =
      block.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/i) ||
      block.match(/<link>([\s\S]*?)<\/link>/i);
    const descMatch =
      block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) ||
      block.match(/<description>([\s\S]*?)<\/description>/i);
    const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const title = titleMatch ? stripTags(titleMatch[1]) : "";
    const url = linkMatch ? stripTags(linkMatch[1]).trim() : "";
    if (!title || !url) continue;
    const summary = descMatch
      ? stripTags(descMatch[1]).slice(0, 180)
      : "";
    let publishedAt: string | null = null;
    if (dateMatch) {
      const d = new Date(dateMatch[1].trim());
      if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
    }
    items.push({
      title,
      url,
      source,
      publishedAt,
      summary,
      category,
    });
  }
  return items;
}

export async function fetchTrends(
  category: TrendCategory,
  limit = 8
): Promise<{ items: TrendItem[]; fetchedAt: string; error?: string }> {
  const fetchedAt = new Date().toISOString();
  const feeds = FEEDS[category];
  const all: TrendItem[] = [];

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        next: { revalidate: 900 },
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml",
          "User-Agent": "OpinionX/1.0 (+https://opinionx-web-jnanesh.vercel.app)",
        },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      all.push(...parseRssItems(xml, feed.source, feed.category, limit));
    } catch {
      // try next feed
    }
  }

  if (all.length === 0) {
    return {
      items: [],
      fetchedAt,
      error: "Live headlines unavailable right now",
    };
  }

  return { items: all.slice(0, limit), fetchedAt };
}

export function formatRelativeShort(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
