"use client";

import { createClient } from "@/lib/supabase/client";
import type { Project, ProjectWithMeta } from "./types";

/**
 * 작가의 모든 작품 + 최신 버전/업데이트 시각 (라이브러리 화면용)
 * V1의 list_projects() 변환. N+1 방지 위해 versions를 단일 쿼리로 조회.
 */
export async function listProjects(writerId: string): Promise<ProjectWithMeta[]> {
  const supabase = createClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .eq("writer_id", writerId)
    .order("updated_at", { ascending: false });

  if (error || !projects) return [];

  if (projects.length === 0) return [];

  const ids = projects.map(p => p.id);
  const { data: versions } = await supabase
    .from("versions")
    .select("project_id, version, created_at")
    .in("project_id", ids)
    .order("version", { ascending: false });

  const byProject = new Map<string, { count: number; latest: number; latestAt: string | null }>();
  for (const v of versions ?? []) {
    const cur = byProject.get(v.project_id) || { count: 0, latest: 0, latestAt: null };
    cur.count += 1;
    if (v.version > cur.latest) {
      cur.latest = v.version;
      cur.latestAt = v.created_at;
    }
    byProject.set(v.project_id, cur);
  }

  return projects.map(p => ({
    ...p,
    versions_count: byProject.get(p.id)?.count ?? 0,
    latest_version: byProject.get(p.id)?.latest ?? 0,
    latest_at: byProject.get(p.id)?.latestAt ?? null,
  }));
}

export async function getProject(writerId: string, name: string): Promise<Project | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("writer_id", writerId)
    .eq("name", name)
    .maybeSingle();
  return data;
}

export async function ensureProject(
  writerId: string,
  name: string,
  fields: Partial<Pick<Project, "genre_letter" | "meta">> = {}
): Promise<Project> {
  const supabase = createClient();
  const existing = await getProject(writerId, name);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("projects")
    .insert({ writer_id: writerId, name, ...fields })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || "프로젝트 생성 실패");
  return data;
}

export async function touchProject(projectId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("projects")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", projectId);
}
