"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * LicenseChecker — V2.11.2 (2026-05-11)
 *
 * 작가 로그인 후 = 자동으로 `/api/license/check` 호출 → JWT 받음 → localStorage 저장.
 * Tauri 환경에서는 = 추가로 invoke('license_save')로 = ~/.sunny-story-maker/license.json 박음.
 *
 * 만료된 license = 자동 갱신. plan="banned" 또는 status="suspended" = 사용 불가 안내.
 *
 * 7일 TTL = 일주일 안에 사장님 plan 변경 = 100% 반영.
 */

const STORAGE_KEY = "sunny.account.anon.license";
const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1시간마다 만료 체크

interface LicensePayload {
  token: string;
  record: {
    plan: string;
    status: string;
    valid_until: string | null;
  };
  issued_at: string;
  expires_in_seconds: number;
}

interface StoredLicense extends LicensePayload {
  expires_at: number; // ms timestamp
}

function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
}

function loadStored(): StoredLicense | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredLicense;
  } catch {
    return null;
  }
}

function saveStored(license: StoredLicense): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(license));
  } catch {
    // ignore
  }
}

async function syncToTauri(license: StoredLicense): Promise<void> {
  if (!isTauri()) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("license_save", {
      token: license.token,
      plan: license.record.plan,
      status: license.record.status,
      validUntil: license.record.valid_until,
    });
  } catch (e) {
    console.warn("Tauri license_save 실패:", e);
  }
}

async function fetchLicense(): Promise<StoredLicense | null> {
  try {
    const res = await fetch("/api/license/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    if (!res.ok) {
      if (res.status === 401) {
        // 로그인 필요 = 정상 (= 미로그인 작가)
        return null;
      }
      const j = await res.json().catch(() => ({}));
      console.warn("License check 실패:", j.error || res.status);
      return null;
    }
    const payload = (await res.json()) as LicensePayload;
    const expires_at = Date.now() + payload.expires_in_seconds * 1000;
    return { ...payload, expires_at };
  } catch (e) {
    console.warn("License check 네트워크 오류:", e);
    return null;
  }
}

/**
 * 백그라운드 작가 라이선스 체커 — 어떤 UI도 렌더링 X (= null 반환).
 * banned/suspended 시 = 콘솔 로그만 (= UI 차단은 다음 라운드).
 */
export function LicenseChecker() {
  const [, setLicense] = useState<StoredLicense | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function check(): Promise<void> {
      // 1. 로그인 상태 확인
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        // 미로그인 = license 정리
        try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        return;
      }

      // 2. 옛 license 만료 체크
      const stored = loadStored();
      const needsRefresh = !stored || stored.expires_at < Date.now() + 24 * 60 * 60 * 1000; // 24h 안에 만료 = refresh

      if (!needsRefresh && stored) {
        // 유효한 license = Tauri 동기화만
        await syncToTauri(stored);
        if (!cancelled) setLicense(stored);
        return;
      }

      // 3. 새 license 발급
      const fresh = await fetchLicense();
      if (cancelled || !fresh) return;
      saveStored(fresh);
      await syncToTauri(fresh);
      setLicense(fresh);

      // 4. banned/suspended 알림 (= 콘솔만)
      if (fresh.record.plan === "banned" || fresh.record.status === "suspended") {
        console.warn(
          "[Story Maker] 계정 상태:",
          fresh.record.plan,
          fresh.record.status,
          "= 사용 제한될 수 있습니다. support@sunnytoon.com 문의."
        );
      }
    }

    // 즉시 체크 + 주기적 갱신
    void check();
    const interval = setInterval(() => void check(), REFRESH_INTERVAL_MS);

    // auth 상태 변화 (= 로그인/로그아웃) 감지
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void check();
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
