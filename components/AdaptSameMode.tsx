"use client";

import { Fragment, useState, useRef, useEffect } from "react";
import { ICONS } from "@/lib/icons";
import { Markdown } from "@/components/Markdown";

export interface ToneChip { id: string; label: string }
export interface AdaptVersion {
  v: number;
  date: string;
  label: string;
  brief: string;
  direction: string;
  diff: string;
  body?: string; // AI 변환 결과 본문 (v2 이후)
}

interface AdaptSameModeProps {
  versions: AdaptVersion[];
  openVer: number | null;
  setOpenVer: (v: number | null) => void;
  TONE_CHIPS: ToneChip[];
  activeChips: string[];
  toggleChip: (id: string) => void;
  freeform: string;
  setFreeform: (v: string) => void;
  onLaunch: (direction: string) => void; // AI 호출 — adapt page에서 처리
  busy?: boolean;
  onStop?: () => void;
  /** ★ 2026-06-01 — 각색 결과 본문을 작가가 직접 클릭 편집(워드식) 시 저장 */
  onEditVersionBody?: (vnum: number, body: string) => void;
}

/** ★ 각색 결과 본문 — write 에디터처럼 클릭하면 바로 편집 + 딴 곳 누르면 자동 저장 */
function VersionBody({ vnum, body, onEdit }: { vnum: number; body: string; onEdit?: (vnum: number, body: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const cancelingRef = useRef(false);
  useEffect(() => { setDraft(body); }, [body]);

  if (!body || !body.trim()) {
    return <div style={{ fontSize: 13, color: "var(--ink-4)", padding: "8px 0" }}>이 버전은 원본입니다 (변환 결과 없음).</div>;
  }
  const save = () => { if (onEdit) onEdit(vnum, draft); setEditing(false); };
  if (editing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (cancelingRef.current) { cancelingRef.current = false; return; } save(); }}
          style={{ width: "100%", minHeight: 260, padding: "14px 16px", fontSize: 14, lineHeight: 1.8, fontFamily: "var(--font-body)", color: "var(--ink-1)", background: "#fff", border: "1px solid var(--coral)", borderRadius: 10, resize: "vertical", whiteSpace: "pre-wrap" }}
        />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button type="button" className="wpara-action" onClick={save}><span className="wpara-action-icon">✓</span><span>저장</span></button>
          <button type="button" className="wpara-action" onMouseDown={() => { cancelingRef.current = true; }} onClick={() => { setDraft(body); setEditing(false); }}><span className="wpara-action-icon">✕</span><span>취소</span></button>
          <span style={{ fontSize: 11, color: "var(--ink-4)", marginLeft: 4 }}>딴 곳을 누르면 자동 저장돼요</span>
        </div>
      </div>
    );
  }
  return (
    <div
      onClick={() => onEdit && setEditing(true)}
      style={{ cursor: onEdit ? "text" : "default", background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: "16px 18px", lineHeight: 1.8, fontSize: 14, maxHeight: "60vh", overflowY: "auto" }}
      title={onEdit ? "클릭해서 바로 수정" : undefined}
    >
      <Markdown text={body} />
    </div>
  );
}

export function AdaptSameMode({
  versions, openVer, setOpenVer,
  TONE_CHIPS, activeChips, toggleChip,
  freeform, setFreeform,
  onLaunch, busy = false, onStop, onEditVersionBody,
}: AdaptSameModeProps) {
  const I = ICONS;
  const nextV = versions[versions.length - 1].v + 1;
  const launchAdapt = () => {
    if (busy) return;
    // chips → label 텍스트 + freeform 합쳐서 디렉션 만듦
    const chipLabels = TONE_CHIPS.filter(c => activeChips.includes(c.id)).map(c => c.label);
    const direction = [
      chipLabels.length ? `톤·방향: ${chipLabels.join(", ")}` : "",
      freeform.trim(),
    ].filter(Boolean).join("\n\n").trim();
    if (!direction) {
      alert("디렉션 칩을 선택하거나 자유 디렉션을 입력해주세요.");
      return;
    }
    onLaunch(direction);
  };

  return (
    <Fragment>
      {/* 타임라인 헤더 */}
      <div className="atl-head">
        <div className="atl-head-title">
          <span className="atl-head-marker">●</span>
          <span>변천사 타임라인</span>
        </div>
        <div className="atl-head-meta">
          <span>{versions.length}개 버전</span>
          <span className="atl-dot">·</span>
          <span>v{nextV} 편집 중</span>
        </div>
      </div>

      {/* 가로 타임라인 */}
      <div className="atl-track-wrap">
        <div className="atl-track-rule"></div>
        <div className="atl-track">
          {versions.map((v, i) => {
            const isLatest = i === versions.length - 1;
            const isOpen = openVer === v.v;
            return (
              <Fragment key={v.v}>
                <button
                  className={
                    "atl-node " +
                    (isLatest ? "is-latest " : "is-past ") +
                    (isOpen ? "is-open" : "")
                  }
                  onClick={() => setOpenVer(isOpen ? null : v.v)}
                  type="button"
                >
                  <div className="atl-node-dot"></div>
                  <div className="atl-node-vnum">v{v.v}</div>
                  <div className="atl-node-date">{v.date}</div>
                  <div className="atl-node-label">{v.label}</div>
                  <div className="atl-node-direction">{v.direction}</div>
                  {isLatest && <div className="atl-node-badge">현재</div>}
                </button>
                <div className="atl-arrow">→</div>
              </Fragment>
            );
          })}
          <div className="atl-next-stub">
            <div className="atl-next-stub-vnum">v{nextV}</div>
            <div className="atl-next-stub-lbl">아래에서 빚는 중</div>
            <div className="atl-next-stub-arrow">↓</div>
          </div>
        </div>
      </div>

      {/* v4 편집 카드 */}
      <div className="atl-edit-card">
        <div className="atl-edit-head">
          <div className="atl-edit-head-left">
            <span className="atl-edit-vnum">v{nextV}</span>
            <span className="atl-edit-arrow">←</span>
            <span className="atl-edit-from">v{versions[versions.length - 1].v}에서 출발</span>
          </div>
          <div className="atl-edit-stamp">
            <span className="atl-edit-stamp-dot"></span>
            지금 빚는 중
          </div>
        </div>

        <div className="atl-edit-grid">
          <div className="atl-edit-col">
            <div className="atl-edit-lbl">디렉션 칩</div>
            <div className="atl-edit-chips">
              {TONE_CHIPS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={"atl-chip" + (activeChips.includes(c.id) ? " is-on" : "")}
                  onClick={() => toggleChip(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="atl-edit-col">
            <div className="atl-edit-lbl">자유 디렉션</div>
            <textarea
              className="atl-edit-text"
              rows={3}
              value={freeform}
              onChange={e => setFreeform(e.target.value)}
              placeholder="예: 주인공 이름을 '도윤'으로, 첫 장면을 옥상으로…"
            />
          </div>
        </div>

        <div className="atl-edit-foot">
          <div className="atl-edit-summary">
            <span>활성 칩 <strong>{activeChips.length}</strong></span>
            <span className="atl-dot">·</span>
            <span>자유 디렉션 <strong>{freeform.split("\n").filter(Boolean).length}줄</strong></span>
            <span className="atl-dot">·</span>
            <span>예상 ~ 4분</span>
          </div>
          <button className="atl-edit-go" type="button" onClick={launchAdapt} disabled={busy}>
            <span className="atl-edit-go-icon">{I.spark}</span>
            <span>{busy ? "변환 중…" : `v${nextV} 생성`}</span>
          </button>
          {busy && onStop && (
            <button className="atl-edit-go" type="button" onClick={onStop}
              style={{ background: "transparent", color: "var(--ink-3)", border: "1px solid var(--line)" }}>
              <span>중지</span>
            </button>
          )}
        </div>
      </div>

      {/* 펼쳐진 과거 버전 상세 */}
      {openVer != null && (() => {
        const v = versions.find(x => x.v === openVer);
        if (!v) return null;
        return (
          <div className="atl-detail">
            <div className="atl-detail-head">
              <div className="atl-detail-head-left">
                <span className="atl-detail-vnum">v{v.v}</span>
                <span className="atl-detail-label">{v.label}</span>
                <span className="atl-detail-date">— {v.date}</span>
              </div>
              <button className="atl-detail-close" onClick={() => setOpenVer(null)} type="button">
                ×<span>닫기</span>
              </button>
            </div>
            <div className="atl-detail-body">
              <div className="atl-detail-row">
                <div className="atl-detail-row-lbl">DIRECTION</div>
                <div className="atl-detail-row-val">{v.direction}</div>
              </div>
              <div className="atl-detail-row">
                <div className="atl-detail-row-lbl">DIFF</div>
                <div className="atl-detail-row-val">{v.diff}</div>
              </div>
              {/* ★ 2026-06-01 — 변환 결과 본문을 바로 보여주고 클릭하면 편집(워드식). 옛: 죽은 버튼만 있고 본문이 안 보였음. */}
              <div className="atl-detail-row" style={{ display: "block" }}>
                <div className="atl-detail-row-lbl" style={{ marginBottom: 8 }}>본문 (클릭해서 수정)</div>
                <VersionBody vnum={v.v} body={v.body || ""} onEdit={onEditVersionBody} />
              </div>
            </div>
          </div>
        );
      })()}
    </Fragment>
  );
}
