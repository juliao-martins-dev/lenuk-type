import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lenuk Type",
  description: "AI-assisted typing game"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
