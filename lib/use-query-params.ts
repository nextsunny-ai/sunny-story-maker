"use client";

import { useSyncExternalStore } from "react";

/**
 * useQueryParams — URL 쿼리스트링을 Suspense 없이 읽는다.
 *
 * next/navigation 의 useSearchParams() 는 Suspense 경계를 요구한다.
 * 그 경계가 직접 로드(주소창 입력·새로고침)에서 풀리지 않으면
 * 페이지 본문이 숨겨진 스트리밍 컨테이너에 갇혀 화면이 비어버린다.
 * (실측 2026-08-26: /develop · /package 직접 로드 시 본문 전체가 사라짐)
 *
 * 두 가지를 같이 지킨다.
 *  1) ready — 서버 렌더·하이드레이션 첫 렌더에서는 쿼리를 모른다.
 *     이 신호가 없으면 "아직 안 읽은 빈 쿼리"를 진짜 값으로 착각해
 *     작가를 다른 화면으로 되돌려 보낸다.
 *  2) 주소 변경 구독 — 앱 안에서 페이지를 옮길 때 history 가 먼저 바뀌므로
 *     pushState·replaceState 를 감싸 변경을 알린다. 안 그러면 옮겨간 화면이
 *     직전 주소의 쿼리를 읽는다.
 */
const PENDING = " pending";
const LOCATION_CHANGE = "sunny:locationchange";

let patched = false;
function patchHistoryOnce() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method];
    window.history[method] = function patchedHistoryMethod(
      this: History,
      ...args: Parameters<History["pushState"]>
    ) {
      const result = original.apply(this, args);
      window.dispatchEvent(new Event(LOCATION_CHANGE));
      return result;
    };
  }
}

function subscribe(onChange: () => void) {
  patchHistoryOnce();
  window.addEventListener("popstate", onChange);
  window.addEventListener(LOCATION_CHANGE, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(LOCATION_CHANGE, onChange);
  };
}

const getSnapshot = () => window.location.search;
const getServerSnapshot = () => PENDING;

export function useQueryParamsState(): { params: URLSearchParams; ready: boolean } {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = search !== PENDING;
  return { params: new URLSearchParams(ready ? search : ""), ready };
}

export function useQueryParams(): URLSearchParams {
  return useQueryParamsState().params;
}
