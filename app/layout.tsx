import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL("https://claude-usage-cap.example.com"),
  title: "Claude Usage Cap | Spend Limits for Anthropic API",
  description:
    "Set per-project day/week/month spend limits for Claude API traffic. Route through a secure proxy and auto-cut off buggy jobs before they burn your budget.",
  keywords: [
    "Claude API cost control",
    "Anthropic budget limits",
    "AI spend cap",
    "API proxy",
    "runaway AI spend"
  ],
  openGraph: {
    title: "Claude Usage Cap",
    description:
      "Per-project spend limits on Claude API with automatic 429 cutoff and Slack alerts.",
    type: "website",
    url: "https://claude-usage-cap.example.com",
    siteName: "Claude Usage Cap"
  },
  twitter: {
    card: "summary_large_image",
    title: "Claude Usage Cap",
    description:
      "Prevent runaway Anthropic spend with per-project caps and automatic proxy cutoff."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <body>
        <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
