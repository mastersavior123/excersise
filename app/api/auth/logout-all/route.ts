import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { clearSessionCookie } from "@/lib/session";

/** session_version을 올려 이 사용자의 모든 기기에서 발급된 세션 쿠키를 즉시 무효화한다(Phase 7). */
export async function POST() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  await prisma.appUser.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
