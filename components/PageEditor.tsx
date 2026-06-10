"use client";

import { useEffect, useRef, useState } from "react";
import type { Para } from "./WriteCanvas";

interface PageEditorProps {
  paras: Para[];
  onEditAll?: (fullText: string) => void;
  aiBusy?: boolean;
}

/**
 * ★ write 에디터 v2 (2026-06-01) — 워드 같은 한 페이지.
 *  - 본문 아무 데나 클릭 = 바로 커서 놓고 직접 타이핑 (옛 단락카드 = 클릭해도 편집 안 되던 사고 해결).
 *  - AI가 써주는 글(스트리밍)도 이 페이지에 실시간으로 나타남.
 *  - 작가가 타이핑하면 = 자동으로 단락에 동기화(저장). 별도 "저장" 버튼 불필요.
 *
 *  모델: 본문은 paras[] 단락 배열. 여기서는 합쳐서 한 텍스트로 보여주고,
 *  작가 편집은 onEditAll(전체텍스트)로 되돌려 단락 재구성.
 */
export function PageEditor({ paras, onEditAll, aiBusy }: PageEditorProps) {
  const fullText = paras
    .filter(p => p.text && p.text.trim())
    .map(p => p.text)
    .join("\n\n");

  const [draft, setDraft] = useState(fullText);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const focusedRef = useRef(false);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ★ 외부(AI 스트리밍·작품 로드)에서 본문이 바뀌면 = 작가가 지금 타이핑 중이 아닐 때만 화면 갱신.
  //   (작가가 입력 중이면 커서가 튀지 않게 건드리지 않음.)
  useEffect(() => {
    if (!focusedRef.current && fullText !== draft) {
      setDraft(fullText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText]);

  // AI가 쓰는 중이면 = 페이지 맨 아래로 자동 스크롤 (작가가 직접 보고 있지 않을 때).
  useEffect(() => {
    if (aiBusy && !focusedRef.current && taRef.current) {
      taRef.current.scrollTop = taRef.current.scrollHeight;
    }
  }, [draft, aiBusy]);

  const commit = (text: string) => {
    if (onEditAll) onEditAll(text);
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setDraft(v);
    // 타이핑 멈추면 자동 저장(단락 동기화).
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => commit(v), 700);
  };

  return (
    <div className="pageed-wrap">
      <textarea
        ref={taRef}
        className="pageed-area"
        value={draft}
        onChange={onChange}
        onFocus={() => { focusedRef.current = true; }}
        onBlur={() => {
          focusedRef.current = false;
          if (commitTimer.current) clearTimeout(commitTimer.current);
          commit(draft);
        }}
        spellCheck={false}
        placeholder={"여기에 바로 쓰세요.\n\n또는 오른쪽 대화창에서 AI에게 “이어 써줘 / 이 장면 더 어둡게 / 톤 바꿔줘” 하고 시키면 이 페이지에 써집니다."}
      />
      {aiBusy && (
        <div className="pageed-aibadge">
          <span className="pageed-aidot" /> AI가 쓰는 중…
        </div>
      )}
    </div>
  );
}
