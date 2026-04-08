import type { Metadata } from "next";
import Script from "next/script";
import TypingSurface from "@/components/typing/typing-surface";
import { ErrorBoundary } from "@/components/error-boundary";
import { homePageDescription, homePageTitle, siteAlternateNames, siteKeywords, siteName, siteOgImageAlt, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: homePageTitle,
  },
  description: homePageDescription,
  keywords: siteKeywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title: homePageTitle,
    description: homePageDescription,
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
    title: homePageTitle,
    description: homePageDescription,
    images: ["/og.png"],
  },
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: siteName,
  alternateName: siteAlternateNames,
  url: siteUrl,
  description: homePageDescription,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript and a modern browser.",
  inLanguage: ["en", "tet"],
  areaServed: {
    "@type": "Country",
    name: "Timor-Leste",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  keywords: siteKeywords.join(", "),
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Lenuk Type?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lenuk Type is a free browser-based typing test for Timor-Leste with Tetun and English practice, timing controls, and a live leaderboard.",
      },
    },
    {
      "@type": "Question",
      name: "Is Lenuk Type the same as Lenuk Timor?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Some people search for Lenuk Timor when they are looking for Lenuk Type, the typing web app focused on Timor-Leste users.",
      },
    },
    {
      "@type": "Question",
      name: "Which languages can I practice on Lenuk Type?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lenuk Type supports Tetun and English typing practice directly in the browser.",
      },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <Script
        id="lenuk-webapp-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <Script
        id="lenuk-faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <ErrorBoundary>
        <TypingSurface />
      </ErrorBoundary>
    </>
  );
}
