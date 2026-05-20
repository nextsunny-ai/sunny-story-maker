"use client";

// V3.0 본문 영역 라우터 — group에 따라 그룹별 Canvas 컴포넌트 선택.
// 단계 1 = PROSE만 본격 (ProseCanvas), 다른 그룹은 paras 기반 폴백.
// 단계 2~6에서 그룹별 Canvas 점진 추가.

import type { WriteDoc, Block } from "@/lib/storymaker/write-doc";
import { ProseCanvas } from "./ProseCanvas";
import { ScreenplayCanvas } from "./ScreenplayCanvas";
import { PanelCanvas } from "./PanelCanvas";
import { CuesheetCanvas } from "./CuesheetCanvas";

export interface MediumCanvasRouterProps {
  doc: WriteDoc;
  paused: boolean;
  onBlockEdit?: (blockId: string, patch: Partial<Block>) => void;
  onBlockRewrite?: (blockId: string) => void;
  onBlockContinue?: (afterBlockId: string) => void;
  onAddHeader?: (level: "episode" | "chapter", title: string, number?: string) => void;
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

    // 단계 3 (PANEL)
    case "PANEL":
    // 단계 4 (CUESHEET)
    case "CUESHEET":
    // 단계 6 (STRUCTURED)
    case "STRUCTURED":
    default:
      // 단계 0~1 임시 = PROSE 폴백 렌더 (텍스트는 다 보임)
      return <ProseCanvas {...props} />;
  }
}
