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
