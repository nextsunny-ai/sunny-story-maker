"use client";

import { createClient } from "@/lib/supabase/client";
import type { Artifact } from "./types";

export async function listArtifacts(projectId: string): Promise<Record<string, Artifact[]>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("artifacts")
    .select("*")
    .eq("project_id", projectId)
    .order("version", { ascending: false });

  const grouped: Record<string, Artifact[]> = {};
  for (const a of data ?? []) {
    grouped[a.artifact_key] ??= [];
    grouped[a.artifact_key].push(a);
  }
  return grouped;
}

export async function loadArtifact(
  projectId: string,
  artifactKey: string,
  version?: number
): Promise<Artifact | null> {
  const supabase = createClient();
  let query = supabase
    .from("artifacts")
    .select("*")
    .eq("project_id", projectId)
    .eq("artifact_key", artifactKey);

  if (version !== undefined) {
    query = query.eq("version", version);
  } else {
    query = query.order("version", { ascending: false }).limit(1);
  }

  const { data } = await query.maybeSingle();
  return data;
}

export async function saveArtifact(
  projectId: string,
  artifactKey: string,
  body: string,
  metadata: Record<string, unknown> = {}
): Promise<Artifact> {
  const supabase = createClient();
  const latest = await loadArtifact(projectId, artifactKey);
  const nextVersion = (latest?.version ?? 0) + 1;

  const { data, error } = await supabase
    .from("artifacts")
    .insert({
      project_id: projectId,
      artifact_key: artifactKey,
      version: nextVersion,
      body,
      metadata,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || "산출물 저장 실패");
  return data;
}
