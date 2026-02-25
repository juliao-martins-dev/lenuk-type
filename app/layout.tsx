import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteName = "Lenuk Type";
const siteUrl = "https://lenuk-type.vercel.app";
const siteTitle = "Lenuk Type | Typing Test & Typing Speed Test";
const siteDescription =
  "Free typing test and typing speed test in English and Tetun. Lenuk Type is a fast monkeytype alternative for Timor-Leste and global users.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | Lenuk Type"
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    "typing test",
    "typing speed test",
    "teste tipu",
    "teste tipu lalais",
    "typing Tetun",
    "monkeytype alternative",
    "Lenuk Type",
    "Timor-Leste typing test"
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: "education",
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon.png", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" }
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
    shortcut: ["/favicon.png"]
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title: siteTitle,
    description: siteDescription,
    locale: "en_US",
    images: [
      {
        url: "/icon.png",
        alt: "Lenuk Type logo"
      }
    ]
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
    images: ["/icon.png"]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteName
  },
  other: {
    "geo.region": "TL",
    "geo.placename": "Timor-Leste",
    language: "English, Tetun"
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#071122" }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeInitScript = `
    (function () {
      try {
        var key = "lenuk-theme";
        var saved = localStorage.getItem(key);
        var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        var isDark = saved ? saved === "dark" : prefersDark;
        document.documentElement.classList.toggle("dark", isDark);
      } catch (e) {
        document.documentElement.classList.add("dark");
      }
    })();
  `;

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    description: siteDescription,
    inLanguage: ["en", "tet"]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        {children}
      </body>
    </html>
  );
}
