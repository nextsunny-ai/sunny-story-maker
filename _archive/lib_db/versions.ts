"use client";

import { createClient } from "@/lib/supabase/client";
import type { Version } from "./types";

export async function listVersions(projectId: string): Promise<Version[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("versions")
    .select("*")
    .eq("project_id", projectId)
    .order("version", { ascending: false });
  return data ?? [];
}

export async function loadVersion(projectId: string, version: number): Promise<Version | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("versions")
    .select("*")
    .eq("project_id", projectId)
    .eq("version", version)
    .maybeSingle();
  return data;
}

export async function latestVersion(projectId: string): Promise<Version | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("versions")
    .select("*")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function saveVersion(
  projectId: string,
  body: string,
  metadata: Record<string, unknown> = {},
  direction: string | null = null,
  parentVersion: number | null = null
): Promise<Version> {
  const supabase = createClient();
  const last = await latestVersion(projectId);
  const nextVersion = (last?.version ?? 0) + 1;

  const { data, error } = await supabase
    .from("versions")
    .insert({
      project_id: projectId,
      version: nextVersion,
      body,
      metadata,
      direction,
      parent_version: parentVersion,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || "버전 저장 실패");
  return data;
}
