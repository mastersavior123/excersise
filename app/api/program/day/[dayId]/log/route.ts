import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { trainingLogSchema } from "@/lib/validation";
import { runFeedbackLoop } from "@/lib/engine/rebalance";

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
    include: { programWeek: { include: { program: true } }, blocks: { select: { id: true } } },
  });
  if (!day || day.programWeek.program.userId !== userId) {
    return NextResponse.json({ error: "찾을 수 없습니다" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = trainingLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" }, { status: 400 });
  }
  const { completed, rpe, pain, motivation, sleepHours, actualDurationMinutes, notes, blockResults } = parsed.data;

  // 블록 결과는 반드시 이 날의 블록이어야 한다 — 남의 블록 id를 섞어 보내도 무시가 아니라 400.
  const ownBlockIds = new Set(day.blocks.map((b) => b.id));
  if (blockResults?.some((r) => !ownBlockIds.has(r.blockId))) {
    return NextResponse.json({ error: "이 세션에 없는 블록입니다" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.trainingLog.upsert({
      where: { programDayId },
      create: { programDayId, completed, rpe, pain, motivation, sleepHours, actualDurationMinutes, notes },
      update: { completed, rpe, pain, motivation, sleepHours, actualDurationMinutes, notes },
    });
    for (const r of blockResults ?? []) {
      if (r.outcome === null) {
        await tx.blockResult.deleteMany({ where: { programBlockId: r.blockId } });
      } else {
        await tx.blockResult.upsert({
          where: { programBlockId: r.blockId },
          create: { programBlockId: r.blockId, outcome: r.outcome },
          update: { outcome: r.outcome },
        });
      }
    }
  });

  const adjustments = await runFeedbackLoop(programDayId);

  return NextResponse.json({ ok: true, adjustments });
}
