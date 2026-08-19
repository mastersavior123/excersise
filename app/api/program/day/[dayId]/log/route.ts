import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { trainingLogSchema } from "@/lib/validation";

export async function POST(req: NextRequest, { params }: { params: Promise<{ dayId: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { dayId } = await params;
  const programDayId = Number(dayId);
  if (!Number.isInteger(programDayId)) {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const day = await prisma.programDay.findUnique({
    where: { id: programDayId },
    include: { programWeek: { include: { program: true } } },
  });
  if (!day || day.programWeek.program.userId !== userId) {
    return NextResponse.json({ error: "찾을 수 없습니다" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = trainingLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" }, { status: 400 });
  }
  const { completed, rpe, pain, sleepHours, notes } = parsed.data;

  await prisma.trainingLog.upsert({
    where: { programDayId },
    create: { programDayId, completed, rpe, pain, sleepHours, notes },
    update: { completed, rpe, pain, sleepHours, notes },
  });

  return NextResponse.json({ ok: true });
}
