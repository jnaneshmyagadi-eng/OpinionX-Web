import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL, SEO_CATEGORIES } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/explore`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/polls`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    ...SEO_CATEGORIES.map((c) => ({
      url: `${SITE_URL}/polls/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];

  const pollRoutes: MetadataRoute.Sitemap = [];

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const supabase = createClient(url, key);
      const { data: polls } = await supabase
        .from("polls")
        .select("id, updated_at, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(2000);

      for (const p of polls ?? []) {
        pollRoutes.push({
          url: `${SITE_URL}/poll/${p.id}`,
          lastModified: new Date(p.updated_at || p.created_at),
          changeFrequency: "daily",
          priority: 0.7,
        });
      }
    }
  } catch {
    // Static routes still returned if DB unavailable
  }

  return [...staticRoutes, ...pollRoutes];
}
