import type { MetadataRoute } from "next";

const baseUrl = "https://lenuk-type.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.7
    }
  ];
}
