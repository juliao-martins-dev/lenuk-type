import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const pages = ["/", "/leaderboard"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((path) => ({
    url: new URL(path, siteUrl).toString()
  }));
}
