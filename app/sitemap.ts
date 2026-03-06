import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const pages = ["/", "/leaderboard"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return pages.map((path) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified,
    changeFrequency: path === "/" ? "daily" : "hourly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
