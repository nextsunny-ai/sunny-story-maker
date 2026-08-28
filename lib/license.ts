// JWT 라이선스 시스템 — 글로벌 룰 16 (BYOK 모델)
//
// 모델:
// - 작가 = 가입 (Supabase) → 자동 trial_30days
// - 데스크탑 앱 = startup 시 = /api/license/check 호출 → JWT 받음 (7일 유효)
// - JWT에 박힘: user_id, plan, status, expires_at
// - 7일 후 = 자동 재발급 시도 → 대표님이 Supabase에서 plan 변경했으면 = 새 JWT에 반영
// - 데스크탑 앱 = JWT 만료 시 = 사용 차단 (= 재로그인 또는 plan 갱신 안내)
//
// Plan 종류:
// - trial_30days: 가입 후 30일 (베타·신규 작가)
// - free: 제한 사용 (월 N작품)
// - pro: 월 ₩9,900 — 무제한
// - studio: 월 ₩29,000 — 멀티 작가
// - lifetime: ₩299,000 일회 — 영구
// - banned: 차단

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export type Plan = "trial_30days" | "free" | "pro" | "studio" | "lifetime" | "banned";

export interface LicensePayload extends JWTPayload {
  user_id: string;
  email: string;
  plan: Plan;
  status: "active" | "expired" | "suspended";
  // 표준 JWT claims:
  // - iss (issuer) = "sunny-story-maker"
  // - sub (subject) = user_id
  // - iat (issued at) = 자동
  // - exp (expiration) = 자동 (7일)
}

export interface LicenseRecord {
  user_id: string;
  email: string;
  plan: Plan;
  status: "active" | "expired" | "suspended";
  // valid_until = plan 만료일 (= trial_30days 시작일 + 30일, 또는 결제 만료일)
  valid_until: string | null; // ISO datetime
  created_at: string;
  updated_at: string;
}

const JWT_ISSUER = "sunny-story-maker";
const JWT_TTL_DAYS = 7;
const JWT_TTL_SECONDS = JWT_TTL_DAYS * 24 * 60 * 60;

function getSecret(): Uint8Array {
  const secret = process.env.LICENSE_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "LICENSE_JWT_SECRET 환경변수가 박혀있지 않거나 32자 미만입니다. " +
      "Vercel 환경변수에 32자 이상의 안전한 secret을 추가해주세요. " +
      "(예: openssl rand -base64 32)"
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * JWT 발급 — Supabase의 user 정보 + license record로 토큰 생성.
 * 7일 유효. 작가 PC는 ~/.sunny/license.json에 저장 → 만료 전 자동 갱신.
 */
export async function issueLicense(record: LicenseRecord): Promise<string> {
  const secret = getSecret();
  const payload: LicensePayload = {
    user_id: record.user_id,
    email: record.email,
    plan: record.plan,
    status: record.status,
  };
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(JWT_ISSUER)
    .setSubject(record.user_id)
    .setIssuedAt()
    .setExpirationTime(`${JWT_TTL_DAYS}d`)
    .sign(secret);
}

/**
 * JWT 검증 — 데스크탑 앱이 startup 시 호출. 만료·서명 잘못 = 거부.
 */
export async function verifyLicense(token: string): Promise<LicensePayload> {
  const secret = getSecret();
  const { payload } = await jwtVerify<LicensePayload>(token, secret, {
    issuer: JWT_ISSUER,
  });
  return payload;
}

/**
 * 작가 가입 직후 = 기본 trial_30days license record 생성.
 * Supabase `subscriptions` 테이블에 insert.
 */
export function createDefaultRecord(userId: string, email: string): Omit<LicenseRecord, "created_at" | "updated_at"> {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);
  return {
    user_id: userId,
    email,
    plan: "trial_30days",
    status: "active",
    valid_until: validUntil.toISOString(),
  };
}

/**
 * Plan별 기능 제한 (= 클라이언트가 사용).
 */
export interface PlanLimits {
  maxWorksPerMonth: number; // -1 = 무제한
  canExportDocx: boolean;
  canUseOsmu: boolean;
  canUseFullPackage: boolean;
  canUseAllReviewers: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  trial_30days: {
    maxWorksPerMonth: -1,
    canExportDocx: true,
    canUseOsmu: true,
    canUseFullPackage: true,
    canUseAllReviewers: true,
  },
  pro: {
    maxWorksPerMonth: -1,
    canExportDocx: true,
    canUseOsmu: true,
    canUseFullPackage: true,
    canUseAllReviewers: true,
  },
  studio: {
    maxWorksPerMonth: -1,
    canExportDocx: true,
    canUseOsmu: true,
    canUseFullPackage: true,
    canUseAllReviewers: true,
  },
  lifetime: {
    maxWorksPerMonth: -1,
    canExportDocx: true,
    canUseOsmu: true,
    canUseFullPackage: true,
    canUseAllReviewers: true,
  },
  free: {
    maxWorksPerMonth: 5,
    canExportDocx: false,
    canUseOsmu: false,
    canUseFullPackage: false,
    canUseAllReviewers: false,
  },
  banned: {
    maxWorksPerMonth: 0,
    canExportDocx: false,
    canUseOsmu: false,
    canUseFullPackage: false,
    canUseAllReviewers: false,
  },
};
