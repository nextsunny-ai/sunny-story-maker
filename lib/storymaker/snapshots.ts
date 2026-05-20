"use client";

// V3.1 D2 — 작품 본문 snapshot 클라이언트 헬퍼.
// 5분마다 변화 감지 → Supabase work_snapshots에 1행 추가.
// 작가가 옛 버전으로 복원 가능.

import { createClient } from "@/lib/supabase/client";
import { logWarn } from "@/lib/log";

export interface SnapshotRow {
  id: string;
  work_id: string;
  title: string | null;
  body: string;
  notes_text: string | null;
  block_count: number;
  char_count: number;
  source: "auto" | "manual" | "ai-done" | "unload";
  created_at: string;
}

export interface CreateSnapshotInput {
  workId: string;
  title?: string;
  body: string;
  notesText?: string;
  blockCount?: number;
  source?: "auto" | "manual" | "ai-done" | "unload";
}

let lastHash = "";
let lastSentAt = 0;

async function hashOf(text: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  return `len:${text.length}`;
}

/**
 * snapshot 생성. 본문 변화 X + 5분 이내 = skip.
 * 인증된 작가만. 실패는 silent.
 */
export async function createSnapshot(input: CreateSnapshotInput): Promise<{ ok: boolean; skipped?: string }> {
  if (!input.workId || !input.body?.trim()) return { ok: false, skipped: "empty" };
  // dedup (= 5분 이내 + 같은 내용 = skip)
  const hash = await hashOf(input.body);
  const now = Date.now();
  if (hash === lastHash && now - lastSentAt < 5 * 60 * 1000 && input.source === "auto") {
    return { ok: false, skipped: "unchanged" };
  }
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { ok: false, skipped: "anon" };

    const { error } = await supabase.from("work_snapshots").insert({
      user_id: userData.user.id,
      work_id: input.workId,
      title: input.title ?? null,
      body: input.body,
      notes_text: input.notesText ?? null,
      block_count: input.blockCount ?? 0,
      char_count: input.body.length,
      source: input.source ?? "auto",
    });
    if (error) {
      logWarn(`snapshot insert failed: ${error.message}`, "snapshots");
      return { ok: false, skipped: error.message };
    }
    lastHash = hash;
    lastSentAt = now;
    return { ok: true };
  } catch (e) {
    logWarn(`snapshot threw: ${e instanceof Error ? e.message : String(e)}`, "snapshots");
    return { ok: false, skipped: "exception" };
  }
}

/**
 * 작품의 옛 snapshot 목록 (= 최근 50개).
 */
export async function listSnapshots(workId: string): Promise<SnapshotRow[]> {
  if (!workId) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("work_snapshots")
      .select("*")
      .eq("work_id", workId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !data) return [];
    return data as SnapshotRow[];
  } catch {
    return [];
  }
}

/**
 * 특정 snapshot 1개 read (= 복원용).
 */
export async function getSnapshot(id: string): Promise<SnapshotRow | null> {
  if (!id) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("work_snapshots")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as SnapshotRow;
  } catch {
    return null;
  }
}
