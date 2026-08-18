import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { assessLevel } from "@/lib/levelAssessment";
import type { Prisma } from "@prisma/client";
import type { MovementGroup } from "@/lib/constants";
import { z } from "zod";

const bodySchema = z.object({
  finalLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다" }, { status: 400 });
  }

  const [profile, oneRms, capabilities] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.userOneRM.findMany({ where: { userId }, orderBy: { measuredAt: "desc" } }),
    prisma.userCapability.findMany({ where: { userId } }),
  ]);

  if (!profile || profile.age === null || profile.weightKg === null || profile.primaryGoals.length === 0) {
    return NextResponse.json({ error: "온보딩 기본정보·목표를 먼저 입력해주세요" }, { status: 400 });
  }

  // lift별 최신 값만 사용 (같은 날 재제출 시 upsert되므로 보통 lift당 1건)
  const latestByLift = new Map<string, (typeof oneRms)[number]>();
  for (const rm of oneRms) {
    if (!latestByLift.has(rm.lift)) latestByLift.set(rm.lift, rm);
  }
  const squatOneRm = latestByLift.get("squat");

  const capabilityMap: Partial<Record<MovementGroup, boolean>> = {};
  for (const c of capabilities) {
    capabilityMap[c.movementGroup as MovementGroup] = c.passed;
  }

  const result = assessLevel({
    capabilities: capabilityMap,
    squatOneRmKg: squatOneRm ? Number(squatOneRm.valueKg) : null,
    bodyweightKg: Number(profile.weightKg),
    recentTrainingFrequencyPerWeek: profile.recentTrainingFrequency,
    primaryGoals: profile.primaryGoals,
  });

  const finalLevel = parsed.data.finalLevel ?? result.suggestedLevel;

  const assessment = await prisma.userLevelAssessment.create({
    data: {
      userId,
      score: result.score,
      breakdown: result.breakdown as unknown as Prisma.InputJsonValue,
      suggestedLevel: result.suggestedLevel,
      finalLevel,
    },
  });

  return NextResponse.json({ ok: true, assessment: { ...assessment, score: Number(assessment.score) } });
}
