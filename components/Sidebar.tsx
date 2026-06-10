"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { ICONS } from "@/lib/icons";
import { GENRES } from "@/lib/genres";
import { Symbol } from "./Symbol";
import { LocaleToggle } from "./LocaleToggle";
import { ThemeToggle } from "./ThemeToggle";

const PATH_TO_NAV: Record<string, string> = {
  "/": "home",
  "/develop": "develop",
  "/write": "write",
  "/adapt": "adapt",
  "/chat": "chat",
  "/review": "review",
  "/osmu": "osmu",
  "/package": "package",
  "/grant": "grant",
  "/library": "library",
  "/resources": "resources",
  "/admin": "admin",
};

const NAV_TO_PATH: Record<string, string> = Object.fromEntries(
  Object.entries(PATH_TO_NAV).map(([p, n]) => [n, p])
);

interface SidebarProps {
  /** 활성 장르 letter (A~M). null이면 공통 모드 */
  activeGenre?: string | null;
  onGenreChange?: (letter: string | null) => void;
  /** 작가 이메일 (사이드바 푸터 표시) */
  userEmail?: string;
  onLogout?: () => void;
}

export function Sidebar({ activeGenre = null, onGenreChange, userEmail, onLogout }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const active = PATH_TO_NAV[pathname] ?? "home";
  const onNav = async (id: string) => {
    // ★ V3.1 — .smkr 프로젝트 파일 열기 (특수 메뉴 — 모든 페이지에서 1클릭)
    if (id === "open-smkr") {
      const { openSmkrFile } = await import("@/lib/storymaker/project-file");
      const result = await openSmkrFile();
      if (!result.ok) {
        if (result.error !== "취소됨") alert(`파일 열기 실패: ${result.error}`);
        return;
      }
      // localStorage temp + /write redirect
      try {
        window.localStorage.setItem("sunny.storymaker.openSmkr", JSON.stringify(result.file));
        router.push("/write?mode=continue&from=smkr");
      } catch (e) {
        alert(`파일 열기 실패: ${e instanceof Error ? e.message : String(e)}`);
      }
      return;
    }
    const path = NAV_TO_PATH[id];
    if (path) router.push(path);
  };

  const I = ICONS;
  const genre = activeGenre ? GENRES.find(g => g.letter === activeGenre) : null;

  // ============================================================
  // GENRE MODE — 사이드바가 그 장르의 워크플로우로 변신
  // ============================================================
  if (genre) {
    const activeStepIdx = 2; // 임시 — DB와 연결 시 작품의 현재 단계로
    return (
      <aside className="sb">
        <div className="sb-brand" onClick={() => router.push("/")} style={{ cursor: "pointer" }}>
          <div className="sb-brand-icon"><Symbol /></div>
          <div className="sb-brand-text">
            <div className="sb-brand-name">Story Maker<span className="dot">.</span></div>
            <div className="sb-brand-by">BY <em>Sunny<span className="dot">.</span></em></div>
          </div>
        </div>

        <div className="sb-genre-mode">
          <div className="sb-genre-mode-icon">{I[genre.letter]}</div>
          <div className="sb-genre-mode-text">
            <div className="sb-genre-mode-eyebrow">NOW WORKING ON</div>
            <div className="sb-genre-mode-name">
              {genre.name.includes(" ") ? (
                <>{genre.name.split(" ")[0]} <em>{genre.name.split(" ").slice(1).join(" ")}</em></>
              ) : (
                <em>{genre.name}</em>
              )}
            </div>
          </div>
          <button
            className="sb-genre-mode-x"
            title="장르 모드 끄기"
            onClick={() => onGenreChange?.(null)}
          >×</button>
        </div>

        <div className="sb-section genre">— {genre.name.toUpperCase()} WORKFLOW</div>
        {genre.steps.map((s, i) => {
          const isActive = i === activeStepIdx;
          const isDone = i < activeStepIdx;
          return (
            <div
              key={s.n}
              className={"sb-genre-step" + (isActive ? " active" : "") + (isDone ? " done" : "")}
              onClick={() => onNav("write")}
            >
              <span className="sb-genre-step-num">{String(s.n).padStart(2, "0")}</span>
              <span className="sb-genre-step-name">{s.name}</span>
              {isDone && <span className="sb-genre-step-status">done</span>}
              {isActive && <span className="sb-genre-step-status">in</span>}
            </div>
          );
        })}

        <div className="sb-export" onClick={() => onNav("package")}>
          <div className="sb-export-icon">{I.download}</div>
          <div className="sb-export-text">
            <div className="sb-export-label">표준 양식 출력</div>
            <div className="sb-export-fmt">{genre.standard}</div>
          </div>
        </div>

        <div className="sb-section" style={{ marginTop: 14 }}>CREATE</div>
        <div className="sb-link" data-active={active === "develop"} onClick={() => onNav("develop")}>{I.pitch}<span>Develop</span></div>
        <div className="sb-link" data-active={active === "write"} onClick={() => onNav("write")}>{I.write}<span>Write</span></div>
        <div className="sb-link" data-active={active === "adapt"} onClick={() => onNav("adapt")}>{I.adapt}<span>Adapt</span></div>

        <div className="sb-section" style={{ marginTop: 14 }}>TOOLS</div>
        <div className="sb-link" data-active={active === "chat"} onClick={() => onNav("chat")}>{I.chat}<span>Co-Writer</span></div>
        <div className="sb-link" data-active={active === "review"} onClick={() => onNav("review")}>{I.review}<span>Review</span></div>
        <div className="sb-link" data-active={active === "osmu"} onClick={() => onNav("osmu")}>{I.osmu}<span>OSMU</span></div>
        <div className="sb-link" data-active={active === "package"} onClick={() => onNav("package")}>{I.package}<span>Plan Package</span></div>

        <div className="sb-section" style={{ marginTop: 14 }}>LIBRARY</div>
        <div className="sb-link" data-active={active === "library"} onClick={() => onNav("library")}>{I.library}<span>Library</span></div>

        <div className="sb-foot">
          {userEmail && <div className="sb-user">{userEmail}</div>}
          <button className="sb-logout" onClick={onLogout}>{I.logout}<span>로그아웃</span></button>
          <div className="sb-version" style={{ fontSize: 10, color: "var(--ink-5)", marginTop: 6, letterSpacing: "0.04em", opacity: 0.7 }} title="현재 설치된 버전">
            v2.13.3
          </div>
        </div>
      </aside>
    );
  }

  // ============================================================
  // DEFAULT MODE — 공통 메뉴 (★ V3.1.1 — 영어 메뉴 = 대표님 명시 2026-05-20)
  // ============================================================
  const links = [
    { section: "WORKSPACE", items: [
      { id: "home", label: "Home", icon: I.home },
      { id: "open-smkr", label: "Open Project", icon: I.download || I.home },
    ]},
    { section: "CREATE", items: [
      { id: "develop", label: "Develop", icon: I.pitch },
      { id: "write",   label: "Write",   icon: I.write },
      { id: "adapt",   label: "Adapt",   icon: I.adapt },
    ]},
    { section: "TOOLS", items: [
      { id: "review",  label: "Review",   icon: I.review },
      { id: "chat",    label: "Co-Writer", icon: I.chat },
      // ★ V3.1.1 — OSMU·Plan Package·Grant 다 재활성 (대표님 명시 2026-05-21)
      // 모두 Haiku 2단계 path 박힘 = 풀 컨텍스트 + 토큰 절약.
      { id: "osmu",    label: "OSMU",          icon: I.osmu },
      { id: "package", label: "Plan Package",  icon: I.package },
      { id: "grant",   label: "Grant",         icon: I.book || I.package },
    ]},
    { section: "LIBRARY", items: [
      { id: "library",   label: "My Works", icon: I.library },
      { id: "resources", label: "Library",  icon: I.book || I.library },
    ]},
    // "Admin" 표기 = 관리자 콘솔로 오해 → 실제는 작가 프로필·설정 = Settings로 정정 (2026-06-10)
    { section: "ACCOUNT", items: [{ id: "admin", label: "Settings", icon: I.settings }] },
  ];

  return (
    <aside className="sb">
      <div className="sb-brand" onClick={() => router.push("/")} style={{ cursor: "pointer" }}>
        <div className="sb-brand-icon"><Symbol /></div>
        <div className="sb-brand-text">
          <div className="sb-brand-name">Story Maker<span className="dot">.</span></div>
          <div className="sb-brand-by">BY <em>Sunny<span className="dot">.</span></em></div>
        </div>
      </div>

      {links.map(group => (
        <React.Fragment key={group.section}>
          <div className="sb-section">{group.section}</div>
          {group.items.map(it => (
            <div
              key={it.id}
              className="sb-link"
              data-active={active === it.id}
              onClick={() => onNav(it.id)}
            >
              {it.icon}
              <span>{it.label}</span>
            </div>
          ))}
        </React.Fragment>
      ))}

      <div className="sb-foot">
        {userEmail && <div className="sb-user">{userEmail}</div>}
        <button className="sb-logout" onClick={onLogout}>{I.logout}<span>로그아웃</span></button>
        <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 6 }}>
          <LocaleToggle compact />
          <ThemeToggle compact />
        </div>
      </div>
    </aside>
  );
}
