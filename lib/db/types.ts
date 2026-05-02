/**
 * V1 schema.sql과 동일한 테이블 구조 (writers/projects/versions/artifacts/chat_messages/learning_lessons)
 * V2에선 RLS auth.uid() 기반으로 점진 이전 — 일단 V1과 동일한 인터페이스 유지
 */

export interface Writer {
  id: string;
  name: string;
  auth_email: string | null;
  profile: Record<string, unknown> | null;
  skill_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  writer_id: string;
  name: string;
  genre_letter: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithMeta extends Project {
  versions_count: number;
  latest_version: number;
  latest_at: string | null;
}

export interface Version {
  id: string;
  project_id: string;
  version: number;
  body: string;
  metadata: Record<string, unknown> | null;
  direction: string | null;
  parent_version: number | null;
  created_at: string;
}

export interface Artifact {
  id: string;
  project_id: string;
  artifact_key: string; // logline, synopsis, treatment, characters, episodes, ...
  version: number;
  body: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  writer_id: string;
  project_id: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  ts: string;
}

export interface LearningLesson {
  id: string;
  writer_id: string;
  project_id: string | null;
  category: "loved" | "rejected" | "direction" | "metaphor";
  content: string;
  created_at: string;
}
