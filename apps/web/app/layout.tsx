import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";

import "./globals.css";
import { AuthProvider } from "@/lib/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";

const UMAMI_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const UMAMI_SRC = process.env.NEXT_PUBLIC_UMAMI_SRC || "https://cloud.umami.is/script.js";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["600", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "ReachFlow — find the right inboxes",
    template: "%s | ReachFlow",
  },
  description:
    "Find the right inboxes. Send emails that get answered. Lead discovery, AI-drafted cold email, and focused campaigns for five outreach workflows.",
  openGraph: {
    siteName: "ReachFlow",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        {/* Self-hosted privacy-first analytics — only loads when configured */}
        {UMAMI_ID && (
          <Script src={UMAMI_SRC} data-website-id={UMAMI_ID} strategy="afterInteractive" />
        )}
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
