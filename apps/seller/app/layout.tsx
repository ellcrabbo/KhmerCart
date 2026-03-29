import { appCatalog } from "@khmercart/core";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const seller = appCatalog.seller;

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"]
});

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  description: seller.description,
  title: seller.title
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={`${sans.variable} ${mono.variable}`} lang="en">
      <body className="font-[family-name:var(--font-sans)] antialiased">{children}</body>
    </html>
  );
}
