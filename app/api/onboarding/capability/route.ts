import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { capabilitySchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = capabilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" }, { status: 400 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.$transaction(
    parsed.data.entries.map((entry) =>
      prisma.userCapability.upsert({
        where: { userId_movementGroup: { userId, movementGroup: entry.movementGroup } },
        create: { userId, movementGroup: entry.movementGroup, passed: entry.passed, checkedAt: today },
        update: { passed: entry.passed, checkedAt: today },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
