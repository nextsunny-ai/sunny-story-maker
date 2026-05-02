import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SUNNY Story Maker — 작가의 첫 줄",
  description: "12개 매체 한국 작가팀 워크플로우. AI Pitch부터 시나리오까지 한 화면에서.",
  icons: { icon: "/assets/symbol.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-tone="B">
      <body>{children}</body>
    </html>
  );
}
