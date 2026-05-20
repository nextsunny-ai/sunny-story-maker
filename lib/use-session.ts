"use client";

// V3.1 #12 — Supabase 세션 자동 refresh 모니터링.
// @supabase/ssr SDK가 token refresh 자체는 자동 처리 — 이 훅은:
//   1. refresh 실패 (= expired + refresh token도 만료) 시 친절 안내
//   2. tab 다시 활성화 시 = 세션 살아있는지 확인 (장기 sleep 후 사고 방지)
//   3. 로그아웃 후 다른 탭에서 알아채게 onAuthStateChange 구독

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { logWarn } from "@/lib/log";

export interface SessionState {
  loading: boolean;
  user: User | null;
  session: Session | null;
  /** 세션이 곧 만료될 때 (= 5분 이내) true */
  expiringSoon: boolean;
  /** refresh 실패 시 true (= 다시 로그인 필요) */
  expired: boolean;
}

export function useSession(): SessionState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<SessionState>({
    loading: true,
    user: null,
    session: null,
    expiringSoon: false,
    expired: false,
  });

  const refresh = useCallback(async () => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setState({
          loading: false,
          user: null,
          session: null,
          expiringSoon: false,
          expired: !!error,
        });
        if (error) logWarn(`session refresh failed: ${error.message}`, "use-session");
        return;
      }
      const expiresAt = data.session.expires_at ?? 0;
      const now = Math.floor(Date.now() / 1000);
      const expiringSoon = expiresAt > 0 && expiresAt - now < 300; // 5분 이내
      setState({
        loading: false,
        user: data.session.user,
        session: data.session,
        expiringSoon,
        expired: false,
      });
    } catch (e) {
      logWarn(`session check threw: ${e instanceof Error ? e.message : String(e)}`, "use-session");
      setState(prev => ({ ...prev, loading: false, expired: true }));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const supabase = createClient();
    // (1) auth state 변화 구독 — refresh·signin·signout 다 잡힘
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        void refresh();
      }
      if (event === "TOKEN_REFRESHED" && !session) {
        // refresh 실패
        setState(prev => ({ ...prev, expired: true }));
      }
    });

    // (2) 탭이 다시 활성화될 때 = 한 번 더 확인 (장기 sleep 후 만료 사고 방지)
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    // (3) 5분마다 가벼운 체크 (= expiringSoon 갱신용)
    const interval = setInterval(() => { void refresh(); }, 5 * 60 * 1000);

    return () => {
      subscription.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [refresh]);

  return { ...state, refresh };
}
