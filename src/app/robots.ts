import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/explore",
        "/poll/",
        "/polls",
        "/polls/",
        "/today",
        "/world",
        "/india",
        "/money",
        "/ai",
        "/people",
        "/trending",
        "/about",
      ],
      disallow: [
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/settings",
        "/chat",
        "/notifications",
        "/create",
        "/ai-assistant",
        "/profile",
        "/profile/edit",
        "/auth/",
        "/api/",
        "/offline",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
