"use client";

import { useState } from "react";
import { ICONS } from "@/lib/icons";
import { Symbol } from "@/components/Symbol";

export default function LoginPage() {
  const I = ICONS;
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showInvite, setShowInvite] = useState(false);

  const quotes = [
    { line: "첫 줄을 쓰는 일은,", em: "언제나 가장 어려운 일.", by: "어떤 작가" },
    { line: "지지 않는 해처럼,", em1: "이야기는 매일", em2: "떠오릅니다.", by: "Sunny." },
    { line: "맡기세요. 처음부터 끝까지,", em: "다 써드립니다.", by: "Story Maker." },
  ];
  const q = quotes[1];

  return (
    <div className="login-page">
      {/* ---- LEFT: Brand panel ---- */}
      <div className="login-brand">
        <div className="login-brand-top">
          <div className="login-mark">
            <div className="login-mark-icon"><Symbol /></div>
            <div className="login-mark-text">
              <div className="login-mark-name">Story Maker<span className="dot">.</span></div>
              <div className="login-mark-by">BY <em>Sunny<span className="dot">.</span></em></div>
            </div>
          </div>
        </div>

        <div className="login-quote">
          <div className="login-quote-eyebrow">— A WRITER&apos;S NOTE</div>
          <div className="login-quote-text">
            {q.line}<br/>
            <em>{q.em1}<br/>{q.em2}</em>
          </div>
          <div className="login-quote-by">— {q.by}</div>
        </div>

        <div className="login-brand-foot">
          <div className="login-brand-foot-row">
            <span className="login-brand-foot-k">Built for writers</span>
            <span className="login-brand-foot-v">12 genres · KR standards</span>
          </div>
          <div className="login-brand-foot-row">
            <span className="login-brand-foot-k">© 2026</span>
            <span className="login-brand-foot-v">Sunny<span className="dot">.</span></span>
          </div>
        </div>
      </div>

      {/* ---- RIGHT: Form panel ---- */}
      <div className="login-form-wrap">
        <div className="login-form">
          <div className="login-form-eyebrow">
            <span className="login-form-bullet"></span>
            {mode === "login" ? "다시 오셨네요" : "처음 오셨네요"}
          </div>

          <h1 className="login-form-title">
            {mode === "login" ? (
              <>오늘도 한 줄,<br/><em>시작해 볼까요</em><span className="dot">.</span></>
            ) : (
              <>이야기의 첫 줄,<br/><em>여기서 시작</em><span className="dot">.</span></>
            )}
          </h1>

          <p className="login-form-sub">
            {mode === "login"
              ? "이메일로 로그인하시면 마지막 작업이 그대로 열립니다."
              : "계정을 만들면 12개 매체 워크플로우가 모두 열립니다. 첫 30일 무료."}
          </p>

          <div className="login-fields">
            {mode === "signup" && (
              <div className="login-field">
                <label>이름</label>
                <input className="field-input" defaultValue="" placeholder="유희정"/>
              </div>
            )}
            <div className="login-field">
              <label>이메일</label>
              <input className="field-input" type="email" defaultValue="" placeholder="you@example.com"/>
            </div>
            <div className="login-field">
              <label>
                비밀번호
                {mode === "login" && <a href="#" className="login-field-link">비밀번호 찾기</a>}
              </label>
              <input className="field-input" type="password" defaultValue=""/>
            </div>
            {mode === "signup" && (
              <div className="login-field">
                <label>
                  초대 코드
                  <span className="login-field-hint">베타 기간 한정</span>
                </label>
                <input className="field-input" type="text" placeholder="SUNNY-XXXX-XXXX"/>
              </div>
            )}
            {mode === "login" && !showInvite && (
              <a href="#" className="login-invite-toggle" onClick={e => { e.preventDefault(); setShowInvite(true); }}>
                + 초대 코드 입력 <span className="login-field-hint">베타 기간 한정</span>
              </a>
            )}
            {mode === "login" && showInvite && (
              <div className="login-field">
                <label>
                  초대 코드
                  <span className="login-field-hint">베타 기간 한정</span>
                </label>
                <input className="field-input" type="text" placeholder="SUNNY-XXXX-XXXX" autoFocus/>
              </div>
            )}
          </div>

          <button className="login-cta">
            <span>{mode === "login" ? "로그인" : "30일 무료로 시작"}</span>
            <span className="login-cta-arrow">{I.arrow}</span>
          </button>

          <div className="login-divider"><span>또는</span></div>

          <div className="login-oauth">
            <button className="login-oauth-btn">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Google로 계속</span>
            </button>
          </div>

          <div className="login-switch">
            {mode === "login" ? (
              <>처음이신가요? <a href="#" onClick={e => { e.preventDefault(); setMode("signup"); }}>30일 무료 시작</a></>
            ) : (
              <>이미 계정이 있으신가요? <a href="#" onClick={e => { e.preventDefault(); setMode("login"); }}>로그인</a></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
