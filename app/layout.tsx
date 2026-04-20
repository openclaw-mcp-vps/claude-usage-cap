import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://claude-usage-cap.com"),
  title: {
    default: "Claude Usage Cap",
    template: "%s | Claude Usage Cap"
  },
  description:
    "Set daily, weekly, and monthly spend caps on Claude API usage per project. Auto-cut off runaway jobs and send Slack alerts the moment limits are hit.",
  keywords: [
    "Claude API budget cap",
    "Anthropic proxy",
    "AI cost control",
    "SaaS founder tools",
    "runaway spend prevention"
  ],
  openGraph: {
    title: "Claude Usage Cap",
    description:
      "Per-project spend limits on the Claude API with automatic 429 cut-off and Slack alerts.",
    url: "https://claude-usage-cap.com",
    siteName: "Claude Usage Cap",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Claude Usage Cap"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Claude Usage Cap",
    description:
      "Per-project spend limits on Claude API usage. Auto-cutoff at cap + Slack alert.",
    images: ["/opengraph-image"]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} bg-[#0d1117] text-[#e6edf3] antialiased`}
        style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
