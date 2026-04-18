import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Disable SW in development so HMR and source maps aren't intercepted.
  disable: process.env.NODE_ENV !== "production",
  // Let the SW take control of open tabs on update + reload in the page.
  register: false, // we register manually from a client component
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.lenuktype.fun" }],
        destination: "https://lenuktype.fun/:path*",
        permanent: true
      }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flagcdn.com",
        pathname: "/24x18/**"
      }
    ]
  }
};

export default withSerwist(nextConfig);
