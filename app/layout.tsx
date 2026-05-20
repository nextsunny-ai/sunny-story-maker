import type { Metadata } from "next";
import "./globals.css";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { LicenseChecker } from "@/components/LicenseChecker";
import { ClaudeCliGate } from "@/components/ClaudeCliGate";
import { ErrorReporter } from "@/components/ErrorReporter";
import { SessionBanner } from "@/components/SessionBanner";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";

// V3.1 G4 — SEO·OG 메타 강화 (= 카톡·트위터·LinkedIn 공유 시 미리보기)
const SITE_URL = "https://story.sunnytoon.com";
const SITE_NAME = "SUNNY Story Maker";
const SITE_TITLE = "SUNNY Story Maker — 작가의 첫 줄";
const SITE_DESC = "12개 매체 한국 작가팀 워크플로우. AI Pitch부터 시나리오·웹툰·웹소설·게임 시나리오까지 한 화면에서. 작가 본인 Claude 구독 사용 = 사장님 비용 0.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s — SUNNY Story Maker" },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  authors: [{ name: "Sunny Ryu (유희정)", url: "https://sunnytoon.com" }],
  keywords: [
    "스토리메이커", "Story Maker", "AI 작가", "시나리오 작성", "웹툰 시나리오",
    "웹소설", "TV 드라마 시나리오", "영화 시나리오", "게임 시나리오",
    "AI 협업", "Claude", "한국 작가팀", "12 매체", "OSMU",
  ],
  icons: {
    icon: [
      { url: "/assets/symbol.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/assets/symbol.svg",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    alternateLocale: ["en_US"],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [
      {
        url: "/assets/og-image.png",
        width: 1200,
        height: 630,
        alt: "SUNNY Story Maker — 작가의 첫 줄",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: ["/assets/og-image.png"],
    creator: "@sunnytoon",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
    languages: { "ko-KR": SITE_URL, "en-US": `${SITE_URL}/en` },
  },
  formatDetection: { telephone: false, email: false, address: false },
};

// JSON-LD 구조화 데이터 (= Google Search·Bing 깊은 인덱싱)
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  alternateName: "스토리메이커",
  url: SITE_URL,
  description: SITE_DESC,
  applicationCategory: "WritingApplication",
  operatingSystem: "Windows, macOS, Web",
  inLanguage: ["ko-KR", "en-US"],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "BYOK — 작가 본인 Claude Pro/Max 구독 사용",
  },
  author: {
    "@type": "Person",
    name: "Sunny Ryu (유희정)",
    jobTitle: "Creative Director, VFX Director",
    url: "https://sunnytoon.com",
  },
  publisher: {
    "@type": "Organization",
    name: "써니엔터테인먼트",
    legalName: "주식회사 써니엔터테인먼트",
    url: "https://sunnytoon.com",
    email: "sunny@sunnyent.co.kr",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-tone="B">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body>
        <SessionBanner />
        {children}
        <FeedbackWidget />
        <LicenseChecker />
        <ClaudeCliGate />
        <ErrorReporter />
        <OnboardingOverlay />
      </body>
    </html>
  );
}
