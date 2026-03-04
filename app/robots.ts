import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const sitemapUrl = new URL("/sitemap.xml", siteUrl).toString();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/results/debug"]
    },
    sitemap: sitemapUrl
  };
}
