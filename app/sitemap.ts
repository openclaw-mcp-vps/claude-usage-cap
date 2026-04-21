import type { MetadataRoute } from "next";

const BASE = "https://claude-usage-cap.microtool.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/stop-anthropic-api-bills`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/claude-api-spending-limits`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/anthropic-per-project-budgets`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
  ];
}
