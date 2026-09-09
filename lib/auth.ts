import { prisma } from "./db";
import { getSessionPayload } from "./session";
import type { AppUser } from "@prisma/client";

export type UserRole = "user" | "coach" | "admin";
export const USER_ROLES: UserRole[] = ["user", "coach", "admin"];

/**
 * 현재 로그인 사용자. 쿠키 서명 검증 + DB의 session_version 비교까지 통과해야 한다 —
 * "모든 기기에서 로그아웃"(session_version 증가) 이후에 발급된 쿠키만 유효하다(Phase 7).
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const payload = await getSessionPayload();
  if (!payload) return null;
  const user = await prisma.appUser.findUnique({ where: { id: payload.userId } });
  if (!user || user.sessionVersion !== payload.sessionVersion) return null;
  return user;
}

/** API 라우트에서 로그인 여부만 필요할 때 쓰는 헬퍼. 세션 버전 검증은 동일하게 거친다. */
export async function requireUserId(): Promise<string | null> {
  const payload = await getSessionPayload();
  if (!payload) return null;
  const user = await prisma.appUser.findUnique({
    where: { id: payload.userId },
    select: { id: true, sessionVersion: true },
  });
  if (!user || user.sessionVersion !== payload.sessionVersion) return null;
  return user.id;
}

/**
 * COACH_EMAILS(콤마 구분) 환경변수. Phase 5에서는 이것이 코치 권한의 전부였지만, Phase 7부터는
 * "첫 관리자를 만들기 위한 부트스트랩"으로만 쓴다 — 여기에 적힌 이메일은 role 컬럼과 무관하게
 * 항상 admin으로 취급되어 UI에서 다른 사람에게 coach/admin을 부여할 수 있다.
 */
export function isBootstrapAdminEmail(email: string): boolean {
  const list = (process.env.COACH_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export function isAdmin(user: Pick<AppUser, "email" | "role">): boolean {
  return user.role === "admin" || isBootstrapAdminEmail(user.email);
}

/** 코치 권한: role이 coach/admin이거나 부트스트랩 관리자. 타인 프로그램 읽기 전용 열람·검수에 사용. */
export function isCoach(user: Pick<AppUser, "email" | "role">): boolean {
  return user.role === "coach" || isAdmin(user);
}
