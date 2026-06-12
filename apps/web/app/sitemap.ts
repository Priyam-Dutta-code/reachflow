import type { MetadataRoute } from "next";

import { VERTICAL_SLUGS } from "@/lib/marketing";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPages = ["", "/pricing", "/changelog", "/privacy", "/terms", "/acceptable-use"];
  const landers = Object.keys(VERTICAL_SLUGS).map((slug) => `/for/${slug}`);

  return [...staticPages, ...landers].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/for/") ? 0.8 : 0.5,
  }));
}
