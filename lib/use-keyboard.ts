// V3.1 #16 — 단축키 훅. write/page.tsx에서 사용.
// Ctrl+S 수동저장 / Ctrl+E 편집 토글 / Ctrl+D 다운로드 / Esc 취소·blur
// macOS = Cmd 동등 (e.metaKey || e.ctrlKey)
//
// 참고: contentEditable·input·textarea 내부에서는 시스템 단축키 (Ctrl+A·Ctrl+C·Ctrl+V) 보존.
// Ctrl+S만 input 내부에서도 가로채서 — 이유: 작가가 단락 수정 중 Ctrl+S = 저장 의도가 명확함.

import { useEffect } from "react";

type Handlers = {
  onSave?: () => void;          // Ctrl+S
  onToggleEdit?: () => void;    // Ctrl+E
  onDownload?: () => void;      // Ctrl+D
  onEscape?: () => void;        // Esc
  onTogglePanel?: () => void;   // Ctrl+B (workbook 토글)
  onUndo?: () => void;          // Ctrl+Z (V3.1 D1)
  onRedo?: () => void;          // Ctrl+Shift+Z / Ctrl+Y
  enabled?: boolean;
};

export function useKeyboard({
  onSave,
  onToggleEdit,
  onDownload,
  onEscape,
  onTogglePanel,
  onUndo,
  onRedo,
  enabled = true,
}: Handlers): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        target?.isContentEditable ||
        tag === "input" ||
        tag === "textarea" ||
        tag === "select";

      const mod = e.metaKey || e.ctrlKey;

      // Esc — 무조건 (편집 중 취소 의도)
      if (e.key === "Escape" && onEscape) {
        onEscape();
        return;
      }

      if (!mod) return;

      // Ctrl+S — input 내부에서도 가로챔 (저장 의도 명확)
      if (e.key === "s" || e.key === "S") {
        if (onSave) {
          e.preventDefault();
          onSave();
        }
        return;
      }

      // Ctrl+Z / Ctrl+Shift+Z — input 내부에서는 OS 기본 (텍스트 undo) 보존
      // 본문 단락 차원의 undo는 input 밖에서만
      if ((e.key === "z" || e.key === "Z") && !isEditable) {
        if (e.shiftKey) {
          if (onRedo) { e.preventDefault(); onRedo(); }
        } else {
          if (onUndo) { e.preventDefault(); onUndo(); }
        }
        return;
      }
      if ((e.key === "y" || e.key === "Y") && !isEditable) {
        if (onRedo) { e.preventDefault(); onRedo(); }
        return;
      }

      // 나머지 단축키는 input·contentEditable 내부에서는 무시
      // (예: input 안에서 Ctrl+E = 줄 끝 이동 같은 OS 동작 보존)
      if (isEditable) return;

      // Ctrl+E — 편집 토글
      if (e.key === "e" || e.key === "E") {
        if (onToggleEdit) {
          e.preventDefault();
          onToggleEdit();
        }
        return;
      }

      // Ctrl+D — 다운로드 (브라우저 북마크 기본 동작 가로챔)
      if (e.key === "d" || e.key === "D") {
        if (onDownload) {
          e.preventDefault();
          onDownload();
        }
        return;
      }

      // Ctrl+B — workbook 토글
      if (e.key === "b" || e.key === "B") {
        if (onTogglePanel) {
          e.preventDefault();
          onTogglePanel();
        }
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave, onToggleEdit, onDownload, onEscape, onTogglePanel, onUndo, onRedo, enabled]);
}
