"use client";

import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "./types";

export async function loadChat(writerId: string, projectId: string | null = null): Promise<ChatMessage[]> {
  const supabase = createClient();
  let query = supabase
    .from("chat_messages")
    .select("*")
    .eq("writer_id", writerId);

  query = projectId ? query.eq("project_id", projectId) : query.is("project_id", null);

  const { data } = await query.order("ts", { ascending: true });
  return data ?? [];
}

/**
 * 메시지 1개 추가 — V1의 race condition (delete + insert) 회피
 */
export async function appendChatMessage(
  writerId: string,
  role: ChatMessage["role"],
  content: string,
  projectId: string | null = null
): Promise<ChatMessage> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      writer_id: writerId,
      project_id: projectId,
      role,
      content,
      ts: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || "채팅 저장 실패");
  return data;
}

export async function clearChat(writerId: string, projectId: string | null = null): Promise<void> {
  const supabase = createClient();
  let query = supabase.from("chat_messages").delete().eq("writer_id", writerId);
  query = projectId ? query.eq("project_id", projectId) : query.is("project_id", null);
  await query;
}
