"use client";

// V3.1 #12 — 세션 만료 안내 배너.
// useSession 훅이 expired = true 감지 시 화면 상단에 표시.
// 작가는 "다시 로그인" 버튼 1클릭 → /login redirect.

import { useSession } from "@/lib/use-session";
import { useRouter, usePathname } from "next/navigation";

export function SessionBanner() {
  const { expired, expiringSoon } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // 로그인 페이지에서는 표시 X
  if (pathname?.startsWith("/login") || pathname?.startsWith("/signup")) return null;
  if (!expired && !expiringSoon) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 99998,
      padding: "10px 16px",
      background: expired ? "#fef3c7" : "#fffbeb",
      color: expired ? "#92400e" : "#b45309",
      borderBottom: `1px solid ${expired ? "#fbbf24" : "#fde68a"}`,
      fontSize: 13, fontWeight: 500,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    }}>
      <span>
        {expired
          ? "🔑 로그인 세션이 만료됐습니다."
          : "⏰ 세션이 곧 만료됩니다 (5분 이내). 작업을 저장하고 다시 로그인하시면 안전합니다."}
      </span>
      <button
        type="button"
        onClick={() => {
          const next = encodeURIComponent(pathname || "/");
          router.push(`/login?next=${next}`);
        }}
        style={{
          padding: "5px 14px", border: "none", borderRadius: 6,
          background: expired ? "#92400e" : "#b45309", color: "#fff",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}
      >
        다시 로그인
      </button>
    </div>
  );
}
