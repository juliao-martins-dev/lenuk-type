import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const pages: Array<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}> = [
  {
    path: "/",
    changeFrequency: "daily",
    priority: 1
  },
  {
    path: "/leaderboard",
    changeFrequency: "hourly",
    priority: 0.7
  },
  {
    path: "/stats",
    changeFrequency: "daily",
    priority: 0.6
  }
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return pages.map(({ path, changeFrequency, priority }) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified: now,
    changeFrequency,
    priority
  }));
}
