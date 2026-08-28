"use client";

import { useState, useRef, useEffect } from "react";
import { streamAgent } from "@/lib/stream-agent";
import { TypingIndicator } from "@/components/TypingIndicator";

/**
 * ItemMiniChat — 카드별 보조작가 채팅 (대표님 명시 2026-05-04)
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
      `★ 작가가 「고쳐줘 · 바꿔줘 · 넣어줘 · 빼줘」라고 하면 = **되묻지 말고 그 자리에서 고친 전문**을 낸다.\n` +
      `  애매하면 가장 자연스러운 쪽으로 네가 정하고, 다른 선택지는 결과를 낸 **뒤에** 한 줄로 덧붙인다.\n` +
      `  「어디에 넣을까요?」 「어느 쪽으로 할까요?」로 되묻지 않는다. 지시가 여러 개면 **전부** 반영한다.\n` +
      `  「이렇게 바꾸면 어떨까요?」 같은 제안만 내지 않는다 = 고친 결과를 낸다.\n` +
      `- 작가가 의견을 묻거나(어때? 어떻게 생각해?) 방향을 상의할 때만 = 옵션 2~3개 제안.\n` +
      `- 답은 = 짧고 = 작가에게 = "이런 건 어때요?" 식 친근.\n` +
      `- 인사·메타 보고 X = 곧바로 답.\n` +
      `\n★★★ 카드 본문 구분 (반드시 지킬 것)\n` +
      `작가 요청이 "${cardLabel}을 이렇게 고쳐라"라서 카드에 들어갈 완성본을 낼 때는,\n` +
      `대화 부분을 먼저 쓰고 그 아래에 다음 줄을 넣은 뒤 완성본 전문을 쓴다:\n` +
      `===카드본문===\n` +
      `- 이 줄 아래는 카드에 그대로 들어간다. 질문·인사·"어느 쪽으로 할까요" 같은 대화문을 넣지 마라.\n` +
      `- ★ 고치라고 한 부분만 고치고 **나머지는 원본 그대로 전부 다시 쓴다**. 요약하거나 생략하면 작가 작업물이 사라진다.\n` +
      `- 아직 완성본을 낼 단계가 아니면(작가가 의견만 물었을 때) 이 줄을 아예 쓰지 마라.\n` +
      `- ★ 작가가 「고쳐줘」라고 했으면 **반드시 이 줄과 완성본을 낸다.** 이게 없으면 작가는 아무것도 못 받는다.`;

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

    // ★ 카드에 들어갈 부분만 고른다.
    //   옛 코드는 채팅 답변 전문을 그대로 카드에 덮어써서,
    //   "어느 쪽으로 할까요?" 같은 대화문이 카드 본문이 되고
    //   원본이 통째로 사라졌다 (실측 2026-08-26: 캐릭터 시트 4,537자 → 526자).
    const MARK = /^={2,}\s*카드\s*본문\s*={2,}\s*$/m;
    const m = MARK.exec(lastAiText);
    let next = m && m.index !== undefined
      ? lastAiText.slice(m.index + m[0].length).trim()
      : lastAiText.trim();

    // ★ 본문 뒤에 붙는 해설 구역은 잘라낸다 (실측 2026-08-27:
    //   「구조 분석 (작가 노트)」·「회차 배분」이 시놉시스 카드에 통째로 들어갔다).
    //   마커를 안 쓰고 전문을 낸 경우가 많아서 여기서 한 번 더 거른다.
    const TAIL = /\n\s*(?:[-=*_]{3,}\s*\n)?\s*(?:#{1,6}\s*)?(?:\*{0,2}[\u2605\u2606]?\s*)?(?:구조\s*분석|작가\s*노트|회차\s*배분|변경\s*요약|변경\s*사항|수정\s*내용|다음\s*제안|추가\s*제안|참고\s*사항|Diff\s*Notes)\b/;
    const tail = TAIL.exec(next);
    if (tail && tail.index !== undefined && tail.index > 100) {
      next = next.slice(0, tail.index).trim();
    }
    // 구분선만 남은 꼬리 제거
    next = next.replace(/\n\s*[-=*_\u2550]{3,}\s*$/,"").trim();

    // 제목 이름은 매번 달라진다 — 형태로도 거른다.
    //   본문(산문)이 끝나고 **굵은 소제목 + 불릿**이 이어지면 그 앞이 카드에 들어갈 부분이다.
    {
      const lines = next.split(/\r?\n/);
      let cut = -1;
      for (let i = 3; i < lines.length; i++) {
        const head = lines[i].trim();
        const isBoldHead = /^\*\*[^*]{2,30}:?\*\*:?$/.test(head) || /^#{1,6}\s/.test(head);
        if (!isBoldHead) continue;
        // 그 아래 3줄 안에 불릿이 두 개 이상이면 = 해설 구역으로 본다
        const near = lines.slice(i + 1, i + 5).filter(l => /^\s*[-·*]\s/.test(l)).length;
        if (near >= 2) { cut = i; break; }
      }
      if (cut > 0) {
        const kept = lines.slice(0, cut).join("\n").trim();
        if (kept.length > 200) next = kept;   // 너무 많이 잘리면 그대로 둔다
      }
    }

    if (!next) {
      setMessages(prev => [...prev, {
        id: "sys_" + Date.now(), role: "ai",
        text: "카드에 넣을 본문이 없습니다. \"그 방향으로 다시 써줘\"라고 한 번 더 요청해 주세요.",
        t: Date.now(),
      }]);
      return;
    }

    // ★ 무엇이 들어가는지 먼저 보여준다 — 엉뚱한 게 저장되는 걸 작가가 막을 수 있게.
    //   (실측 2026-08-27: 「구조 분석」·「한국 드라마 특성」 같은 해설이 카드에 섞여 들어갔다)
    {
      const head = next.slice(0, 160).replace(/\s+/g, " ");
      const tail = next.length > 320 ? next.slice(-120).replace(/\s+/g, " ") : "";
      const ok = window.confirm(
        `${cardLabel} 카드에 이렇게 저장합니다 (${next.length.toLocaleString()}자).\n\n` +
        `[처음]\n${head}…\n\n` +
        (tail ? `[끝]\n…${tail}\n\n` : "") +
        `이대로 저장할까요?`
      );
      if (!ok) return;
    }

    // ★ 분량이 크게 줄면 = 원본 유실 위험 = 작가에게 먼저 묻는다.
    const before = (currentText || "").trim().length;
    if (before > 400 && next.length < before * 0.6) {
      const ok = window.confirm(
        `현재 ${cardLabel}은 ${before.toLocaleString()}자인데 저장하려는 내용은 ${next.length.toLocaleString()}자입니다.\n\n` +
        `기존 내용이 줄어듭니다. 그대로 저장할까요?\n\n` +
        `(취소하고 "빠진 부분까지 전부 다시 써줘"라고 요청하시면 원본을 지킬 수 있습니다.)`
      );
      if (!ok) return;
    }

    onApply(next);
    setMessages(prev => [...prev, {
      id: "sys_" + Date.now(),
      role: "ai",
      text: `✓ ${cardLabel} 카드에 저장했습니다. 되돌리려면 카드의 「↩ 되돌리기」를 누르세요.`,
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
              {m.text || (busy && m.role === "ai" ? <TypingIndicator /> : "")}
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
