"use client";

import { useState, useRef, useEffect } from "react";
import { streamAgent } from "@/lib/stream-agent";

/**
 * ItemMiniChat — 카드별 보조작가 채팅 (사장님 명시 2026-05-04)
 *
 * 작가-AI 협업 모드:
 * - 카드 = 원고지 (= 결과 표시)
 * - 그 아래 채팅 = 같이 다듬는 워크룸
 * - 작가: "다 싫은데 더 심플한 거?" / "주인공 이름 박을까?" / 자기 자료 박기
 * - AI: 제안·질문·재작성 (= 30년 CD가 후배에게 디렉션 듣고 답하는 식)
 *
 * 사용 패턴:
 *   <ItemMiniChat
 *     workId="A-내_작품"
 *     cardKey="title"
 *     cardLabel="제목"
 *     currentText={cardText}
 *     mode="title"
 *     idea={ideaParam}
 *     genreLetter={genreParam}
 *     onApply={(newText) => setCardText(newText)}
 *   />
 */

interface MiniChatMsg {
  id: string;
  role: "writer" | "ai";
  text: string;
  t: number; // timestamp
}

interface ItemMiniChatProps {
  workId: string;
  cardKey: string;        // "title" / "logline" / "characters" / "synopsis" / ...
  cardLabel: string;      // "제목" / "로그라인" / ...
  currentText: string;    // 현재 카드 본문 (= AI에게 prior로 박음)
  mode: string;           // API mode (title / logline / ...)
  idea: string;
  genreLetter: string;
  mediumFields?: Record<string, string | string[] | number>;
  onApply: (newText: string) => void;
  /** 채팅 펼침 기본값 (false = 작가가 「💬 같이 다듬기」 클릭 시 펼침) */
  defaultOpen?: boolean;
}

const PRESETS_BY_KEY: Record<string, string[]> = {
  title: ["더 심플하게", "더 임팩트 있게", "주인공 이름 넣기", "다른 안 5개"],
  logline: ["더 짧게", "감정 더", "갈등 명확히", "다른 톤으로"],
  characters: ["주인공 더 차분하게", "조연 한 명 추가", "나이 올리기", "비유 체계 추가"],
  theme: ["더 구체적으로", "현대 감각으로", "질문형으로"],
  synopsis: ["더 어둡게", "더 따뜻하게", "반전 추가", "결말 오픈"],
  structure: ["기승전결 비중 조정", "에피소드 분할", "절정 강화"],
};

export function ItemMiniChat({
  workId,
  cardKey,
  cardLabel,
  currentText,
  mode,
  idea,
  genreLetter,
  mediumFields,
  onApply,
  defaultOpen = false,
}: ItemMiniChatProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<MiniChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastAiText, setLastAiText] = useState(""); // 「✓ 카드에 적용」 대상
  const scrollRef = useRef<HTMLDivElement>(null);

  // 자동 스크롤 (새 메시지)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);

    const writerMsg: MiniChatMsg = {
      id: "w_" + Date.now(),
      role: "writer",
      text,
      t: Date.now(),
    };
    setMessages(prev => [...prev, writerMsg]);

    // AI 응답 = 빈 메시지로 시작 → delta로 채워짐
    const aiMsgId = "ai_" + Date.now();
    const aiMsg: MiniChatMsg = { id: aiMsgId, role: "ai", text: "", t: Date.now() };
    setMessages(prev => [...prev, aiMsg]);

    // ★ prior에 = 현재 카드 본문 + 작가 디렉션 박음
    const prior: Record<string, string> = {};
    if (currentText && currentText.trim()) {
      prior[`현재 ${cardLabel} (작가가 다듬고 싶어함)`] = currentText.slice(0, 4000);
    }
    prior["★ 작가 디렉션 (이번 요청)"] = text;
    prior["★ 협업 모드 룰"] =
      `이 호출 = 카드 ${cardLabel}을 = 작가와 같이 다듬는 협업.\n` +
      `- 작가 디렉션 = 그대로 받아서 = 새 ${cardLabel} 박거나 = 옵션 2-3개 제안하거나 = 모호하면 질문.\n` +
      `- 일방 답 X = 작가가 "그 방향으로 써봐" 하면 = 그때 새 본문 박음.\n` +
      `- 답은 = 짧고 = 작가에게 = "이런 건 어때요?" 식 친근.\n` +
      `- 인사·메타 보고 X = 곧바로 답.`;

    let collected = "";
    try {
      await streamAgent({
        body: {
          mode,
          idea,
          genreLetter,
          mediumFields: mediumFields ?? {},
          fast: true,
          workId,
          prior,
          // ★ V2.13.2 — 작가 채팅창 호출 = 항상 대화 모드 (= stage builder 5개 후보 형식 무시 + 작가 메시지 우선)
          isChatMode: true,
        },
        userPromptSummary: `[${cardLabel} 다듬기] ${text}`.slice(0, 200),
        onDelta: (chunk) => {
          collected += chunk;
          setMessages(prev => prev.map(m =>
            m.id === aiMsgId ? { ...m, text: m.text + chunk } : m
          ));
        },
        onError: (err) => {
          setMessages(prev => prev.map(m =>
            m.id === aiMsgId ? { ...m, text: `⚠ ${err}` } : m
          ));
        },
      });
      if (collected.trim()) setLastAiText(collected.trim());
    } finally {
      setBusy(false);
    }
  };

  const onApplyClick = () => {
    if (!lastAiText) return;
    onApply(lastAiText);
    setMessages(prev => [...prev, {
      id: "sys_" + Date.now(),
      role: "ai",
      text: `✓ ${cardLabel} 카드에 박음.`,
      t: Date.now(),
    }]);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          marginTop: 8,
          padding: "6px 12px",
          fontSize: 11.5,
          fontWeight: 600,
          background: "transparent",
          color: "var(--ink-3)",
          border: "1px dashed var(--line)",
          borderRadius: 6,
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
        }}
        title="카드 결과 = 같이 다듬기"
      >
        💬 같이 다듬기 (보조작가와 채팅)
      </button>
    );
  }

  const presets = PRESETS_BY_KEY[cardKey] || [];

  return (
    <div style={{
      marginTop: 8,
      border: "1px solid var(--coral)",
      borderRadius: 8,
      background: "var(--card)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      maxHeight: 420,  // ★ 옛 320 = 5개 후보 + 작가 메시지 다 안 들어가서 답답 인상 → 420으로 늘림 (= 스크롤 작동 + 최근 응답 자동 표시)
    }}>
      {/* 헤더 */}
      <div style={{
        padding: "6px 12px",
        background: "var(--coral-soft)",
        fontSize: 11,
        color: "var(--coral-deep)",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span>💬 {cardLabel} 같이 다듬기</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 11,
            color: "var(--coral-deep)",
            padding: "0 4px",
          }}
          title="닫기"
        >×</button>
      </div>

      {/* 메시지 영역 */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 10,
          fontSize: 12.5,
          lineHeight: 1.5,
          minHeight: 80,
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: "var(--ink-4)", fontSize: 11.5, fontStyle: "italic" }}>
            예: "더 심플하게" / "주인공 이름 넣을까?" / "내 캐릭터 시트 = (붙여넣기)"<br/>
            보조작가와 같이 다듬어가는 채팅. 좋은 답 = 「✓ 카드에 저장」 누르면 = 카드에 적용.
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} style={{
            marginBottom: 8,
            padding: "6px 10px",
            background: m.role === "writer" ? "var(--card-soft)" : "rgba(64, 200, 130, 0.06)",
            borderRadius: 6,
            border: `1px solid ${m.role === "writer" ? "var(--line)" : "rgba(64, 160, 100, 0.2)"}`,
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: m.role === "writer" ? "var(--ink-4)" : "rgb(64, 160, 100)",
              marginBottom: 2,
              letterSpacing: "0.05em",
            }}>
              {m.role === "writer" ? "작가" : "보조작가"}
            </div>
            <div style={{ color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>
              {m.text || (busy && m.role === "ai" ? "응답 중…" : "")}
            </div>
          </div>
        ))}
      </div>

      {/* 프리셋 칩 (자주 쓰는 디렉션) */}
      {presets.length > 0 && messages.length < 2 && (
        <div style={{
          padding: "4px 10px",
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          borderTop: "1px solid var(--line)",
        }}>
          {presets.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => send(p)}
              disabled={busy}
              style={{
                padding: "3px 8px",
                fontSize: 10.5,
                background: "transparent",
                color: "var(--ink-3)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.5 : 1,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* 입력창 + 버튼 */}
      <div style={{
        padding: 8,
        borderTop: "1px solid var(--line)",
        display: "flex",
        gap: 6,
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="디렉션 입력 / 자기 자료 붙여넣기 (Enter = 보내기, Shift+Enter = 줄바꿈)"
          disabled={busy}
          style={{
            flex: 1,
            padding: "6px 8px",
            fontSize: 12,
            border: "1px solid var(--line)",
            borderRadius: 4,
            resize: "none",
            minHeight: 30,
            maxHeight: 80,
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button
            type="button"
            onClick={() => send()}
            disabled={busy || !input.trim()}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              background: busy || !input.trim() ? "var(--card-soft)" : "var(--coral)",
              color: busy || !input.trim() ? "var(--ink-4)" : "#fff",
              border: `1px solid ${busy || !input.trim() ? "var(--line)" : "var(--coral)"}`,
              borderRadius: 4,
              cursor: busy || !input.trim() ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {busy ? "…" : "↑ 보내기"}
          </button>
          {lastAiText && (
            <button
              type="button"
              onClick={onApplyClick}
              disabled={busy}
              title="마지막 보조작가 응답 = 카드 본문에 박음"
              style={{
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 600,
                background: "rgba(64, 200, 130, 0.15)",
                color: "rgb(64, 160, 100)",
                border: "1px solid rgba(64, 200, 130, 0.5)",
                borderRadius: 4,
                cursor: busy ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              ✓ 카드에 저장
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
