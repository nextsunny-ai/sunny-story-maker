// V3.1 G4 — robots.txt 자동 생성 (Next.js App Router 컨벤션)
import type { MetadataRoute } from "next";

const SITE_URL = "https://story.sunnytoon.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/admin/dashboard",
          "/api/",
          "/_private_downloads/",
          "/_next/",
          "/auth/",
          "/write",     // 작가 본문 = 비공개
          "/develop",
          "/review",
          "/library",
          "/osmu",
          "/package",
          "/adapt",
          "/chat",
          "/manage",
          "/settings",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
