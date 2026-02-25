import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lenuk Type",
    short_name: "Lenuk Type",
    description: "Typing test and typing speed test in English and Tetun",
    start_url: "/",
    display: "standalone",
    background_color: "#071122",
    theme_color: "#2ea8ff",
    lang: "en",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png"
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
