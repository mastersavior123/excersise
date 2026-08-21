import { prisma } from "./db";
import { getSessionUserId } from "./session";
import type { AppUser } from "@prisma/client";

export async function getCurrentUser(): Promise<AppUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.appUser.findUnique({ where: { id: userId } });
}

/** API 라우트에서 로그인 여부만 필요할 때 쓰는 가벼운 헬퍼. 세션이 없으면 null. */
export async function requireUserId(): Promise<string | null> {
  return getSessionUserId();
}

/**
 * COACH_EMAILS(콤마 구분) 환경변수 기반의 최소 권한 체크. 별도 role 컬럼이나 초대 절차
 * 없이 운영자가 직접 관리하는 이메일 allowlist다 — 실제 코치 계정 관리(가입 승인, 감사
 * 로그 등)가 필요해지면 진짜 RBAC으로 바꿔야 한다(README 참고).
 */
export function isCoachEmail(email: string): boolean {
  const list = (process.env.COACH_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
