"use client";

import { createClient } from "@/lib/supabase/client";
import type { Writer } from "./types";

export async function getWriter(writerId: string): Promise<Writer | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("writers")
    .select("*")
    .eq("id", writerId)
    .maybeSingle();
  return data;
}

export async function getWriterByEmail(email: string): Promise<Writer | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("writers")
    .select("*")
    .eq("auth_email", email)
    .maybeSingle();
  return data;
}

export async function ensureWriter(name: string, email: string): Promise<Writer> {
  const supabase = createClient();
  const existing = await getWriterByEmail(email);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("writers")
    .insert({ name, auth_email: email })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || "작가 생성 실패");
  return data;
}

export async function updateProfile(
  writerId: string,
  profile: Record<string, unknown>
): Promise<Writer> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("writers")
    .update({ profile, updated_at: new Date().toISOString() })
    .eq("id", writerId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || "프로필 업데이트 실패");
  return data;
}
