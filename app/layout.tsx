import type { Metadata } from "next";
import Script from "next/script";

import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Claude Usage Cap",
    template: "%s | Claude Usage Cap"
  },
  description:
    "Set per-project spend limits for Anthropic Claude API usage. Get a proxy key with daily, weekly, and monthly caps plus instant Slack alerts when limits are hit.",
  openGraph: {
    title: "Claude Usage Cap",
    description:
      "Per-project spend limits on the Claude API with auto-cutoff and Slack alerts to stop runaway costs.",
    url: "/",
    siteName: "Claude Usage Cap",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Claude Usage Cap",
    description:
      "Stop runaway Anthropic spend. Enforce hard daily, weekly, and monthly caps on every project."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0d1117] text-[#e6edf3] antialiased">
        <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
