import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { benchmarkResultSchema } from "@/lib/validation";
import { parseBenchmarkResult } from "@/lib/benchmarkParse";

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = benchmarkResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" }, { status: 400 });
  }
  const { year, workout, resultText, notes, isPublic, scaled } = parsed.data;

  const openWorkout = await prisma.openWorkout.findUnique({ where: { year_workout: { year, workout } } });
  if (!openWorkout) {
    return NextResponse.json({ error: "존재하지 않는 오픈 워크아웃입니다" }, { status: 400 });
  }

  // 원문은 그대로 두고 구조화 값만 덧붙인다. 체크박스가 없으면 원문의 Rx/Scaled 표기를 힌트로 쓴다.
  const p = parseBenchmarkResult(resultText);
  const structured = {
    resultKind: p.kind,
    resultSeconds: p.seconds ?? null,
    resultReps: p.reps ?? null,
    resultRounds: p.rounds ?? null,
    resultLoadKg: p.loadKg ?? null,
    scaled: scaled ?? p.scaledHint ?? false,
    isPublic: isPublic ?? false,
  };

  const saved = await prisma.benchmarkResult.upsert({
    where: { userId_year_workout: { userId, year, workout } },
    create: { userId, year, workout, resultText, notes, ...structured },
    update: { resultText, notes, recordedAt: new Date(), ...structured },
  });

  return NextResponse.json({ ok: true, parsedKind: saved.resultKind, isPublic: saved.isPublic, scaled: saved.scaled });
}
