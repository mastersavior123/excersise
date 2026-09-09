import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { followSchema } from "@/lib/validation";
import { notify } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = followSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" }, { status: 400 });
  }
  const { followeeId } = parsed.data;
  if (followeeId === userId) {
    return NextResponse.json({ error: "자기 자신은 팔로우할 수 없습니다" }, { status: 400 });
  }

  const followee = await prisma.appUser.findUnique({ where: { id: followeeId }, select: { id: true } });
  if (!followee) return NextResponse.json({ error: "존재하지 않는 사용자입니다" }, { status: 404 });

  const existing = await prisma.follow.findUnique({
    where: { followerId_followeeId: { followerId: userId, followeeId } },
  });
  if (!existing) {
    const follower = await prisma.appUser.findUnique({ where: { id: userId }, select: { email: true } });
    await prisma.follow.create({ data: { followerId: userId, followeeId } });
    // Phase 7: 새 팔로워 알림. 재팔로우(언팔로우 후 다시)도 새 행이므로 다시 알린다 — 스팸 방지 없음(README).
    await notify(followeeId, "new_follower", `${follower?.email ?? "누군가"} 님이 회원님을 팔로우했습니다`, "/feed");
  }

  return NextResponse.json({ ok: true, following: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = followSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" }, { status: 400 });
  }

  await prisma.follow.deleteMany({
    where: { followerId: userId, followeeId: parsed.data.followeeId },
  });

  return NextResponse.json({ ok: true, following: false });
}
