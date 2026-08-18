import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { oneRmSchema } from "@/lib/validation";

// 오늘 날짜로 5개 리프트를 한 번에 기록한다. 같은 날 다시 제출하면(재방문 등) 값을 덮어쓴다 —
// user_one_rm의 unique(userId, lift, measuredAt) 제약과 맞물린 동작이다.
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = oneRmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" }, { status: 400 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.$transaction(
    parsed.data.entries.map((entry) =>
      prisma.userOneRM.upsert({
        where: { userId_lift_measuredAt: { userId, lift: entry.lift, measuredAt: today } },
        create: { userId, lift: entry.lift, valueKg: entry.valueKg, isEstimated: entry.isEstimated, measuredAt: today },
        update: { valueKg: entry.valueKg, isEstimated: entry.isEstimated },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
