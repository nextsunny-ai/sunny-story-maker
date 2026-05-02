import * as React from "react";
/* ============================================================
   Icon library — line SVG, currentColor
   ============================================================ */

export const ICONS: Record<string, React.ReactNode> = {
  // Brand mark — SUNNY symbol simplified
  brand: (
    <svg viewBox="0 0 32 32" fill="none">
      <line x1="16" y1="6" x2="16" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="9" y1="9" x2="11" y2="11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="23" y1="9" x2="21" y2="11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M 7 19 A 9 9 0 0 1 25 19 Z" fill="currentColor"/>
      <line x1="5" y1="19" x2="27" y2="19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="9" y1="23" x2="23" y2="23" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6"/>
      <line x1="9" y1="26" x2="20" y2="26" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.4"/>
    </svg>
  ),

  // ---- Sidebar nav ----
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11 L12 4 L21 11 V20 a1 1 0 0 1 -1 1 H4 a1 1 0 0 1 -1 -1 Z"/>
      <path d="M9 21 V13 H15 V21"/>
    </svg>
  ),
  pitch: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L13.5 9 L20 10 L15 14.5 L16.5 21 L12 17.5 L7.5 21 L9 14.5 L4 10 L10.5 9 Z"/>
    </svg>
  ),
  package: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8 L12 3 L3 8 V16 L12 21 L21 16 Z"/>
      <path d="M3 8 L12 13 L21 8"/>
      <path d="M12 13 V21"/>
    </svg>
  ),
  write: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20 L4 17 L15 6 L18 9 L7 20 Z"/>
      <path d="M14 7 L17 10"/>
      <path d="M4 20 H20"/>
    </svg>
  ),
  adapt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7 H17 L14 4"/>
      <path d="M20 17 H7 L10 20"/>
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5 H20 V16 H13 L8 21 V16 H4 Z"/>
    </svg>
  ),
  osmu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <circle cx="5" cy="6" r="2"/>
      <circle cx="19" cy="6" r="2"/>
      <circle cx="5" cy="18" r="2"/>
      <circle cx="19" cy="18" r="2"/>
      <path d="M9.5 10.5 L6.5 7.5 M14.5 10.5 L17.5 7.5 M9.5 13.5 L6.5 16.5 M14.5 13.5 L17.5 16.5"/>
    </svg>
  ),
  review: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6"/>
      <path d="M16 16 L21 21"/>
    </svg>
  ),
  library: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4 H8 V20 H4 Z"/>
      <path d="M10 4 H14 V20 H10 Z"/>
      <path d="M16 6 L20 7 L17 21 L13 20 Z"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 8 V5 H4 V20 H14 V17"/>
      <path d="M10 12 H21 M18 9 L21 12 L18 15"/>
    </svg>
  ),

  // ---- Generic UI ----
  arrow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="13 6 19 12 13 18"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 12 10 17 19 7"/>
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4 V16 M7 11 L12 16 L17 11"/>
      <path d="M5 20 H19"/>
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7 H19 M9 7 V4 H15 V7 M7 7 L8 21 H16 L17 7"/>
    </svg>
  ),
  save: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4 H17 L20 7 V20 H4 V5 a1 1 0 0 1 1 -1 Z"/>
      <path d="M7 4 V9 H15 V4"/>
      <rect x="8" y="13" width="8" height="6"/>
    </svg>
  ),
  spark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L13.5 10 L20 12 L13.5 14 L12 21 L10.5 14 L4 12 L10.5 10 Z"/>
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12 L21 4 L13 21 L11 13 Z"/>
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <line x1="12" y1="11" x2="12" y2="17"/>
      <circle cx="12" cy="8" r="0.5" fill="currentColor"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M4.5 4.5 L6.7 6.7 M17.3 17.3 L19.5 19.5 M4.5 19.5 L6.7 17.3 M17.3 6.7 L19.5 4.5"/>
    </svg>
  ),

  // ---- Genre icons (12개 — A~M) ----
  // 라인 SVG, 32x32 viewBox, currentColor
  // A. TV 드라마 — TV
  A: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="9" width="24" height="15" rx="2"/>
      <path d="M11 4 L16 9 L21 4"/>
      <path d="M12 28 L20 28"/>
    </svg>
  ),
  // B. 영화 — film slate
  B: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="13" width="24" height="14" rx="2"/>
      <path d="M4 13 L8 6 L13 6 L9 13"/>
      <path d="M13 13 L17 6 L22 6 L18 13"/>
      <path d="M22 13 L26 6"/>
    </svg>
  ),
  // C. 숏드라마 — phone vertical
  C: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="14" height="26" rx="3"/>
      <line x1="13" y1="6" x2="19" y2="6"/>
      <circle cx="16" cy="25" r="0.8" fill="currentColor"/>
    </svg>
  ),
  // D. 애니메이션 — sparkle / star
  D: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4 L18.5 13.5 L28 16 L18.5 18.5 L16 28 L13.5 18.5 L4 16 L13.5 13.5 Z"/>
    </svg>
  ),
  // F. 웹툰 — grid panels
  F: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="9" height="9"/>
      <rect x="18" y="5" width="9" height="9"/>
      <rect x="5" y="18" width="9" height="9"/>
      <rect x="18" y="18" width="9" height="9"/>
    </svg>
  ),
  // G. 다큐멘터리 — microphone
  G: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="13" y="4" width="6" height="14" rx="3"/>
      <path d="M8 16 a8 8 0 0 0 16 0"/>
      <line x1="16" y1="24" x2="16" y2="28"/>
      <line x1="12" y1="28" x2="20" y2="28"/>
    </svg>
  ),
  // H. 웹소설 — book
  H: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6 H14 a4 4 0 0 1 4 4 V28 a3 3 0 0 0 -3 -3 H4 Z"/>
      <path d="M28 6 H18 a4 4 0 0 0 -4 4 V28 a3 3 0 0 1 3 -3 H28 Z"/>
    </svg>
  ),
  // I. 뮤지컬 — eighth note + curtain
  I: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="22" r="3"/>
      <path d="M14 22 V6 L23 9 V11"/>
      <path d="M14 11 L23 14"/>
    </svg>
  ),
  // J. 유튜브 — play
  J: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="26" height="18" rx="3"/>
      <path d="M14 13 L20 16 L14 19 Z" fill="currentColor"/>
    </svg>
  ),
  // K. 전시 — gallery / picture
  K: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="24" height="20" rx="2"/>
      <circle cx="11" cy="13" r="2"/>
      <path d="M4 22 L11 17 L17 22 L22 19 L28 24"/>
    </svg>
  ),
  // L. 게임 — gamepad
  L: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 10 H24 a4 4 0 0 1 4 4 V20 a4 4 0 0 1 -4 4 L20 22 H12 L8 24 a4 4 0 0 1 -4 -4 V14 a4 4 0 0 1 4 -4 Z"/>
      <line x1="11" y1="14" x2="11" y2="18"/>
      <line x1="9" y1="16" x2="13" y2="16"/>
      <circle cx="22" cy="15" r="1" fill="currentColor"/>
      <circle cx="22" cy="19" r="1" fill="currentColor"/>
    </svg>
  ),
  // M. 예능 — trophy
  M: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 5 H22 V13 a6 6 0 0 1 -12 0 Z"/>
      <path d="M10 7 H6 V11 a4 4 0 0 0 4 4"/>
      <path d="M22 7 H26 V11 a4 4 0 0 1 -4 4"/>
      <path d="M14 19 V23 H18 V19"/>
      <path d="M11 27 H21"/>
      <line x1="14" y1="23" x2="14" y2="27"/>
      <line x1="18" y1="23" x2="18" y2="27"/>
    </svg>
  ),
  // N. 연극 — masks (theater)
  N: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8 a8 8 0 0 1 12 0 v8 a6 6 0 0 1 -12 0 Z"/>
      <circle cx="9" cy="13" r="0.8" fill="currentColor"/>
      <circle cx="15" cy="13" r="0.8" fill="currentColor"/>
      <path d="M9.5 17 q2.5 2 5 0"/>
      <path d="M14 11 a8 8 0 0 1 12 0 v8 a6 6 0 0 1 -12 0"/>
    </svg>
  ),
  // O. 소설 — book (open)
  O: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6 H14 a2 2 0 0 1 2 2 V26 a2 2 0 0 0 -2 -2 H4 Z"/>
      <path d="M28 6 H18 a2 2 0 0 0 -2 2 V26 a2 2 0 0 1 2 -2 H28 Z"/>
      <line x1="7" y1="11" x2="13" y2="11"/>
      <line x1="7" y1="15" x2="13" y2="15"/>
      <line x1="19" y1="11" x2="25" y2="11"/>
      <line x1="19" y1="15" x2="25" y2="15"/>
    </svg>
  ),
  // P. 에세이 — feather/pen
  P: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 26 L20 12 a6 6 0 0 1 6 -2 l1 1 a6 6 0 0 1 -2 6 L11 31"/>
      <line x1="6" y1="26" x2="14" y2="18"/>
      <path d="M16 16 L22 16"/>
      <path d="M14 18 L20 18"/>
    </svg>
  ),
};
