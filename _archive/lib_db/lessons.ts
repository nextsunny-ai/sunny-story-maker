"use client";

import { createClient } from "@/lib/supabase/client";
import type { LearningLesson } from "./types";

export async function loadLessons(
  writerId: string,
  projectId: string | null = null
): Promise<{
  loved: string[];
  rejected: string[];
  directions: string[];
  metaphors: string[];
}> {
  const supabase = createClient();
  let query = supabase
    .from("learning_lessons")
    .select("category, content")
    .eq("writer_id", writerId);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data } = await query.order("created_at", { ascending: false });

  const grouped = { loved: [] as string[], rejected: [] as string[], directions: [] as string[], metaphors: [] as string[] };
  for (const l of data ?? []) {
    if (l.category === "loved") grouped.loved.push(l.content);
    else if (l.category === "rejected") grouped.rejected.push(l.content);
    else if (l.category === "direction") grouped.directions.push(l.content);
    else if (l.category === "metaphor") grouped.metaphors.push(l.content);
  }
  return grouped;
}

export async function addLesson(
  writerId: string,
  category: LearningLesson["category"],
  content: string,
  projectId: string | null = null
): Promise<LearningLesson> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("learning_lessons")
    .insert({ writer_id: writerId, project_id: projectId, category, content })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || "학습 항목 저장 실패");
  return data;
}
