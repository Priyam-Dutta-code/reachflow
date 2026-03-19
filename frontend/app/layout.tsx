import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://reachflow-indol.vercel.app"),
  title: {
    default: "ReachFlow | Lead Discovery And Cold Email Workflows",
    template: "%s | ReachFlow",
  },
  description:
    "Discover web leads, enrich email-ready contacts, craft premium cold emails, and launch focused outreach workflows from one polished workspace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
