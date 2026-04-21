import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/projects", "/api"] }],
    sitemap: "https://claude-usage-cap.microtool.dev/sitemap.xml",
  };
}
