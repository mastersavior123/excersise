import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { benchmarkResultSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = benchmarkResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" }, { status: 400 });
  }
  const { year, workout, resultText, notes } = parsed.data;

  const openWorkout = await prisma.openWorkout.findUnique({ where: { year_workout: { year, workout } } });
  if (!openWorkout) {
    return NextResponse.json({ error: "존재하지 않는 오픈 워크아웃입니다" }, { status: 400 });
  }

  await prisma.benchmarkResult.upsert({
    where: { userId_year_workout: { userId, year, workout } },
    create: { userId, year, workout, resultText, notes },
    update: { resultText, notes, recordedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
