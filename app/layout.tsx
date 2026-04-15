import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteAlternateNames, siteDescription, siteKeywords, siteName, siteOgImageAlt, siteTitle, siteUrl } from "@/lib/site";
import { I18nProvider } from "@/components/providers/i18n-provider";
import {
  RUNTIME_CONFIG_GLOBAL,
  getServerPublicConfig,
  serializePublicConfig,
} from "@/lib/public-config";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: siteTitle,
    template: "%s | Lenuk Type",
  },
  description: siteDescription,

  applicationName: siteName,
  category: "education",

  keywords: siteKeywords,

  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,

  alternates: {
    canonical: siteUrl
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon.png", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png" },
      { url: "/apple-icon.png", type: "image/png" },
    ],
    shortcut: ["/favicon.ico", "/favicon.png"],
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
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: siteOgImageAlt,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og.png"],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteName,
  },

  other: {
    "geo.region": "TL",
    "geo.placename": "Timor-Leste",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#071122" },
  ],
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
    alternateName: siteAlternateNames,
    url: siteUrl,
    description: siteDescription,
    inLanguage: ["en", "tet"],
    keywords: siteKeywords.join(", "),
    areaServed: {
      "@type": "Country",
      name: "Timor-Leste",
    },
  };

  // Runtime-injected public config. Emitted from the server at request time
  // so values never land in the compiled client JS bundle.
  const publicConfig = getServerPublicConfig();
  const publicConfigScript = `window.${RUNTIME_CONFIG_GLOBAL}=${serializePublicConfig(publicConfig)};`;
  const plausibleDomain = process.env.PLAUSIBLE_DOMAIN?.trim();

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: publicConfigScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <I18nProvider>{children}</I18nProvider>
        {/* Plausible Analytics — loads only when PLAUSIBLE_DOMAIN is set */}
        {plausibleDomain && (
          <script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
          />
        )}
      </body>
    </html>
  );
}
