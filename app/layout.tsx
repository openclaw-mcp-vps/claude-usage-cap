import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  metadataBase: new URL("https://claude-usage-cap.example.com"),
  title: "Claude Usage Cap | Per-Project Spend Limits for Claude API",
  description:
    "Protect Claude API projects with hard daily, weekly, and monthly spend caps, proxy keys, and Slack cutoff alerts.",
  openGraph: {
    title: "Claude Usage Cap",
    description:
      "Per-project Claude API spend limits with automatic 429 cutoff and Slack alerts to prevent runaway bills.",
    url: "https://claude-usage-cap.example.com",
    siteName: "Claude Usage Cap",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Claude Usage Cap",
    description:
      "Put hard budget caps in front of Claude API usage. Stop accidental overnight spend from bad loops and experiments."
  },
  keywords: [
    "Anthropic budget cap",
    "Claude API proxy",
    "LLM cost control",
    "AI spend limits",
    "SaaS founder tooling"
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
