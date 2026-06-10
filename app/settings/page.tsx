"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Symbol } from "@/components/Symbol";
import { loadStoragePrefs, saveStoragePrefs, pickBackupFolder, getCurrentBackupFolder, type StoragePrefs } from "@/lib/storymaker/storage-prefs";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // ★ V3.1 — 저장 위치 설정
  const [prefs, setPrefs] = useState<StoragePrefs>(loadStoragePrefs);
  const [currentFolder, setCurrentFolder] = useState<string>("");
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window);
    getCurrentBackupFolder().then(setCurrentFolder);
  }, [prefs.backupFolder]);

  const updatePrefs = (patch: Partial<StoragePrefs>) => {
    saveStoragePrefs(patch);
    setPrefs(prev => ({ ...prev, ...patch }));
  };

  const handlePickFolder = async () => {
    const folder = await pickBackupFolder();
    if (folder) {
      setPrefs(prev => ({ ...prev, backupFolder: folder }));
    }
  };

  const handleResetFolder = () => {
    if (!confirm("백업 폴더를 기본값 (~/Documents/StoryMaker/)으로 되돌릴까요?")) return;
    updatePrefs({ backupFolder: null });
  };

  // ★ V3.1.1 — 현재 저장 폴더를 OS 탐색기에 열기 (Tauri 데스크탑 앱만)
  const handleOpenFolder = async () => {
    if (!isTauri) {
      alert("데스크탑 앱에서만 = 폴더 열기 가능합니다. 웹 = 폴더 위치만 확인 가능.");
      return;
    }
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      const target = currentFolder || prefs.backupFolder;
      if (!target) {
        alert("저장 폴더가 설정돼 있지 않습니다. 먼저 📁 폴더 변경으로 폴더를 선택하세요.");
        return;
      }
      await open(target);
    } catch (e) {
      alert("폴더 열기 실패: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login?redirect=/settings");
        return;
      }
      setUserEmail(data.user.email ?? null);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignOut(): Promise<void> {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-4)" }}>로딩 중...</main>;
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "20px 32px", borderBottom: "1px solid var(--line)" }}>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 12, textDecoration: "none", color: "var(--ink)" }}>
          <span style={{ width: 28, height: 28, color: "var(--ink)" }}><Symbol size={28} /></span>
          <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 18, fontWeight: 500 }}>
            Story Maker<span style={{ color: "var(--coral)" }}>.</span>
          </span>
        </a>
      </header>

      <div style={{ flex: 1, maxWidth: 720, margin: "0 auto", width: "100%", padding: "60px 32px" }}>
        <div style={{ fontSize: 11, color: "var(--ink-5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          — SETTINGS
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 38, lineHeight: 1.2, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.02em", margin: 0 }}>
          계정<span style={{ color: "var(--coral)" }}>.</span>
        </h1>

        {/* 계정 정보 */}
        <section style={{ marginTop: 36, padding: "20px 24px", background: "var(--card-soft)", border: "1px solid var(--line)", borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", marginBottom: 8, textTransform: "uppercase" }}>
            로그인 계정
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 14, color: "var(--ink-1)" }}>{userEmail}</div>
            <button onClick={handleSignOut} style={{ padding: "8px 14px", fontSize: 12, background: "transparent", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ink-3)", cursor: "pointer" }}>
              로그아웃
            </button>
          </div>
        </section>

        {/* ★ V3.1 — 저장 위치 설정 */}
        <section style={{ marginTop: 24, padding: "20px 24px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--ink-4)", marginBottom: 14, textTransform: "uppercase" }}>
            💾 작품 저장 위치
          </div>

          {/* 1. 클라우드 동기화 */}
          <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: "1px dashed var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)", marginBottom: 4 }}>
                  ☁️ 클라우드 동기화 (Supabase)
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-4)", lineHeight: 1.6 }}>
                  켜기 = 다른 PC·핸드폰에서 로그인하면 작품 그대로 복원.<br />
                  끄기 = <strong>본 PC만</strong> 저장 (= 노트북 잃어버리면 작품 사라짐).
                </div>
              </div>
              <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={prefs.cloudSync}
                  onChange={e => updatePrefs({ cloudSync: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: "var(--coral)" }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: prefs.cloudSync ? "var(--coral)" : "var(--ink-4)" }}>
                  {prefs.cloudSync ? "켬" : "끔"}
                </span>
              </label>
            </div>
          </div>

          {/* 2. 백업 폴더 (Tauri 데스크탑) */}
          <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: "1px dashed var(--line)" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)", marginBottom: 4 }}>
              📂 .docx 백업 폴더 {!isTauri && <span style={{ fontSize: 11, color: "var(--ink-5)", fontWeight: 400 }}>(데스크탑 앱 전용)</span>}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-4)", lineHeight: 1.6, marginBottom: 10 }}>
              60초마다 작품이 .docx 파일로 자동 저장됩니다.<br />
              Google Drive·Dropbox·USB 폴더 = 같이 동기화하시려면 = 그 폴더 선택.
            </div>
            <div style={{
              padding: "10px 12px",
              background: "var(--card-soft)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              fontFamily: "monospace",
              fontSize: 11.5,
              color: "var(--ink-2)",
              marginBottom: 10,
              wordBreak: "break-all",
            }}>
              {currentFolder || "로딩 중…"}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handlePickFolder}
                disabled={!isTauri}
                style={{
                  padding: "7px 14px",
                  fontSize: 12, fontWeight: 600,
                  background: isTauri ? "var(--coral)" : "var(--card-soft)",
                  color: isTauri ? "#fff" : "var(--ink-5)",
                  border: "none",
                  borderRadius: 6,
                  cursor: isTauri ? "pointer" : "not-allowed",
                }}
              >
                📁 폴더 변경
              </button>
              {/* ★ V3.1.1 — 현재 저장 폴더 = OS 탐색기에 열기 */}
              <button
                type="button"
                onClick={handleOpenFolder}
                disabled={!isTauri}
                style={{
                  padding: "7px 14px",
                  fontSize: 12, fontWeight: 600,
                  background: isTauri ? "var(--card-soft)" : "var(--card-soft)",
                  color: isTauri ? "var(--ink-1)" : "var(--ink-5)",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  cursor: isTauri ? "pointer" : "not-allowed",
                }}
                title={isTauri ? "현재 저장 폴더를 탐색기에 열기" : "데스크탑 앱에서만 가능"}
              >
                📂 폴더 열기
              </button>
              {prefs.backupFolder && (
                <button
                  type="button"
                  onClick={handleResetFolder}
                  style={{
                    padding: "7px 14px",
                    fontSize: 12, fontWeight: 500,
                    background: "transparent",
                    color: "var(--ink-4)",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  ↺ 기본값으로
                </button>
              )}
            </div>
          </div>

          {/* 3. 백업 빈도 */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)", marginBottom: 4 }}>
              ⏱ 자동 백업 빈도
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-4)", lineHeight: 1.6, marginBottom: 10 }}>
              짧을수록 안전. 길수록 디스크 부담 적음.
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[30, 60, 300].map(sec => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => updatePrefs({ backupIntervalSec: sec })}
                  style={{
                    padding: "6px 14px",
                    fontSize: 12, fontWeight: 600,
                    background: prefs.backupIntervalSec === sec ? "var(--coral)" : "transparent",
                    color: prefs.backupIntervalSec === sec ? "#fff" : "var(--ink-3)",
                    border: prefs.backupIntervalSec === sec ? "1px solid var(--coral)" : "1px solid var(--line)",
                    borderRadius: 999,
                    cursor: "pointer",
                  }}
                >
                  {sec < 60 ? `${sec}초` : `${sec / 60}분`}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16, padding: "10px 12px", background: "var(--card-soft)", borderRadius: 6, fontSize: 11.5, color: "var(--ink-4)", lineHeight: 1.6 }}>
            💡 <strong>3중 백업</strong>: 본 PC localStorage (즉시) + 클라우드 (로그인 시) + .docx 폴더 (데스크탑).<br />
            작품 = 안전합니다.
          </div>
        </section>

        {/* 데스크탑 버전 안내 */}
        <section style={{ marginTop: 24, padding: "20px 24px", background: "rgba(255, 107, 107, 0.06)", border: "1px solid rgba(255, 107, 107, 0.25)", borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--coral)", marginBottom: 8, textTransform: "uppercase" }}>
            ★ Story Maker 사용 방법 — 데스크탑 버전
          </div>
          <div style={{ fontSize: 14, color: "var(--ink-1)", lineHeight: 1.65, marginBottom: 12 }}>
            Story Maker는 <strong>데스크탑 버전</strong>에서 사용합니다.
            <strong>Claude Pro 구독 ($20/월)</strong>만 있으면 본인 PC에서 <strong>추가 비용 없이 무제한</strong>으로 쓸 수 있습니다.
            <br />
            한 번 설치하면 바탕화면 바로가기로 바로 실행됩니다.
          </div>
          <a href="/download" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "white", background: "var(--coral)", borderRadius: 8, textDecoration: "none" }}>
            데스크탑 버전 다운로드 →
          </a>
        </section>

        <div style={{ marginTop: 32, fontSize: 12, color: "var(--ink-5)", textAlign: "center" }}>
          <a href="/privacy" style={{ color: "var(--ink-4)", textDecoration: "none", marginRight: 16 }}>개인정보처리방침</a>
          <a href="/terms" style={{ color: "var(--ink-4)", textDecoration: "none", marginRight: 16 }}>이용약관</a>
          <a href="/changelog" style={{ color: "var(--ink-4)", textDecoration: "none" }}>변경 이력</a>
        </div>
      </div>
    </main>
  );
}
