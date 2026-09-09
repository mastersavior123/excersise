import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, isAdmin, isBootstrapAdminEmail, USER_ROLES } from "@/lib/auth";

const bodySchema = z.object({
  userId: z.string().min(1),
  role: z.enum(USER_ROLES as [string, ...string[]]),
});

export async function POST(req: NextRequest) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  if (!isAdmin(actor)) return NextResponse.json({ error: "관리자만 역할을 바꿀 수 있습니다" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "입력값이 올바르지 않습니다" }, { status: 400 });
  const { userId, role } = parsed.data;

  // 자기 자신을 강등해 관리자가 아무도 남지 않는 상황을 막는다(부트스트랩 이메일은 env로 항상 복구 가능).
  if (userId === actor.id && role !== "admin" && !isBootstrapAdminEmail(actor.email)) {
    return NextResponse.json({ error: "자기 자신의 관리자 권한은 내릴 수 없습니다" }, { status: 400 });
  }

  const target = await prisma.appUser.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "존재하지 않는 사용자입니다" }, { status: 404 });

  await prisma.appUser.update({ where: { id: userId }, data: { role } });
  return NextResponse.json({ ok: true, role });
}
