import { appCatalog } from "@khmercart/core";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { readDefaultBuyerLocale } from "./lib/i18n";
import "./globals.css";

const web = appCatalog.web;

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
  description: web.description,
  title: {
    default: web.title,
    template: "%s | KhmerCart"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const defaultLocale = readDefaultBuyerLocale(process.env);

  return (
    <html className={`${sans.variable} ${mono.variable}`} lang={defaultLocale}>
      <body className="font-[family-name:var(--font-sans)] antialiased">{children}</body>
    </html>
  );
}
