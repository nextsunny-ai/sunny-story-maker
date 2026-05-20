// V3.1 D1 — Undo/Redo history stack 훅.
// 본문 paras 상태 변화를 기록 → Ctrl+Z (undo) · Ctrl+Shift+Z / Ctrl+Y (redo)
//
// 룰:
//   - 최대 50개 history (= 메모리 보호)
//   - debounce 500ms (= 키 입력마다 push X)
//   - "snapshot" 함수 = 의미 단위로 명시 push (= 단락 삭제·추가·수정 직후)
//   - undo = 작가가 실수로 단락 삭제 = 즉시 복구

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_HISTORY = 50;
const DEBOUNCE_MS = 500;

export interface UndoState<T> {
  state: T;
  setState: (next: T) => void;
  /** 명시 snapshot = 의미 단위로 history push */
  snapshot: (next: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (initial: T) => void;
}

export function useUndo<T>(initial: T): UndoState<T> {
  const [state, _setState] = useState<T>(initial);
  const historyRef = useRef<T[]>([initial]);
  const indexRef = useRef<number>(0);
  const [pulse, setPulse] = useState(0); // canUndo/canRedo re-render trigger
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const snapshot = useCallback((next: T) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const hist = historyRef.current;
    // index 이후 history 잘라냄 (= 새 분기)
    hist.splice(indexRef.current + 1);
    hist.push(next);
    // 최대 길이 초과 = 가장 옛 거 drop
    if (hist.length > MAX_HISTORY) hist.shift();
    indexRef.current = hist.length - 1;
    _setState(next);
    setPulse(p => p + 1);
  }, []);

  const setState = useCallback((next: T) => {
    // 즉시 state 갱신 + debounce snapshot
    _setState(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const hist = historyRef.current;
      hist.splice(indexRef.current + 1);
      hist.push(next);
      if (hist.length > MAX_HISTORY) hist.shift();
      indexRef.current = hist.length - 1;
      setPulse(p => p + 1);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
  }, []);

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current -= 1;
    _setState(historyRef.current[indexRef.current]);
    setPulse(p => p + 1);
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current += 1;
    _setState(historyRef.current[indexRef.current]);
    setPulse(p => p + 1);
  }, []);

  const reset = useCallback((initial: T) => {
    historyRef.current = [initial];
    indexRef.current = 0;
    _setState(initial);
    setPulse(p => p + 1);
  }, []);

  // cleanup on unmount
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length - 1;

  // pulse 값을 의존성에 박아 hook 호출자가 re-render 받게
  void pulse;

  return { state, setState, snapshot, undo, redo, canUndo, canRedo, reset };
}
