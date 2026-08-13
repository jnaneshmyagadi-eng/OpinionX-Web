import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/explore`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
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
        .limit(1000);

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
    // Sitemap still returns static routes if DB is unavailable at build time
  }

  return [...staticRoutes, ...pollRoutes];
}
