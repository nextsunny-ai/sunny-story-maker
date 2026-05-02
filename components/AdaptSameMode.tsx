"use client";

import { Fragment } from "react";
import { ICONS } from "@/lib/icons";

export interface ToneChip { id: string; label: string }
export interface AdaptVersion {
  v: number;
  date: string;
  label: string;
  brief: string;
  direction: string;
  diff: string;
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
}

export function AdaptSameMode({
  versions, openVer, setOpenVer,
  TONE_CHIPS, activeChips, toggleChip,
  freeform, setFreeform,
}: AdaptSameModeProps) {
  const I = ICONS;
  const nextV = versions[versions.length - 1].v + 1;

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
          <button className="atl-edit-go" type="button">
            <span className="atl-edit-go-icon">{I.spark}</span>
            <span>v{nextV} 생성</span>
          </button>
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
              <div className="atl-detail-actions">
                <button className="atl-detail-act" type="button">
                  {I.eye || I.review}<span>이 버전 본문 열기</span>
                </button>
                <button className="atl-detail-act" type="button">
                  {I.spark}<span>이 버전을 v{nextV}의 출발점으로</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </Fragment>
  );
}
