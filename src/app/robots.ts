import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/explore", "/poll/"],
        disallow: [
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/settings",
          "/chat",
          "/notifications",
          "/create",
          "/ai",
          "/profile",
          "/profile/edit",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
