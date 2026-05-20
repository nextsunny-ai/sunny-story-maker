"use client";

// V3.0 본문 영역 라우터 — group에 따라 그룹별 Canvas 컴포넌트 선택.
// 단계 1 = PROSE만 본격 (ProseCanvas), 다른 그룹은 paras 기반 폴백.
// 단계 2~6에서 그룹별 Canvas 점진 추가.

import type { WriteDoc, Block } from "@/lib/storymaker/write-doc";
import { ProseCanvas } from "./ProseCanvas";
import { ScreenplayCanvas } from "./ScreenplayCanvas";
import { PanelCanvas } from "./PanelCanvas";
import { CuesheetCanvas } from "./CuesheetCanvas";
import { StructuredCanvas } from "./StructuredCanvas";

export interface MediumCanvasRouterProps {
  doc: WriteDoc;
  paused: boolean;
  onBlockEdit?: (blockId: string, patch: Partial<Block>) => void;
  onBlockRewrite?: (blockId: string) => void;
  onBlockContinue?: (afterBlockId: string) => void;
  onAddHeader?: (level: "episode" | "chapter", title: string, number?: string) => void;
  /** ★ V3.1 B6 — 블록 삭제 (Zone·GameLine·컷 등 매체별 블록) */
  onBlockDelete?: (blockId: string) => void;
  /** ★ V3.1 B6 — 블록 순서 이동 (위/아래 1칸) */
  onBlockMove?: (blockId: string, direction: "up" | "down") => void;
  /** ★ V3.1 B5 — CUESHEET 컬럼 추가 (작가가 자유 컬럼 박기) */
  onColumnAdd?: (label: string) => void;
  /** ★ V3.1 B5 — CUESHEET 컬럼 삭제 */
  onColumnRemove?: (key: string) => void;
}

export function MediumCanvasRouter(props: MediumCanvasRouterProps) {
  const { doc } = props;

  switch (doc.group) {
    case "PROSE":
      return <ProseCanvas {...props} />;

    // 단계 2 (V3.0) — SCREENPLAY + STAGE = ScreenplayCanvas (대사 인라인 수정)
    case "SCREENPLAY":
    case "STAGE":
      return <ScreenplayCanvas {...props} />;

    // 단계 3 (V3.0) — PANEL 웹툰 = PanelCanvas (컷 카드)
    case "PANEL":
      return <PanelCanvas {...props} />;

    // 단계 4 (V3.0) — CUESHEET = CuesheetCanvas (시간축 표)
    case "CUESHEET":
      return <CuesheetCanvas {...props} />;

    // 단계 6 (V3.0) — STRUCTURED = StructuredCanvas (K 전시·L 게임)
    //   ★ 대표님이 가장 많이 쓰는 매체. letter로 K vs L 내부 분기.
    case "STRUCTURED":
      return <StructuredCanvas {...props} />;

    default:
      return <ProseCanvas {...props} />;
  }
}
