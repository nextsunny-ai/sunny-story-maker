"use client";

// V3.1 #14 — 글로벌 에러 수집을 1회 install. 마운트만 하면 됨 (UI X).

import { useEffect } from "react";
import { installGlobalErrorHandlers } from "@/lib/log";

export function ErrorReporter() {
  useEffect(() => {
    installGlobalErrorHandlers();
  }, []);
  return null;
}
