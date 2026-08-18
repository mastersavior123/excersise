import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { healthFlagsSchema, resourcesGoalsSchema } from "@/lib/validation";
import { z } from "zod";

const bodySchema = resourcesGoalsSchema.and(healthFlagsSchema);

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" }, { status: 400 });
  }
  const { trainingDaysPerWeek, sessionMinutesBudget, equipmentAvailable, spaceType, primaryGoals, entries } =
    parsed.data;

  await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      trainingDaysPerWeek,
      sessionMinutesBudget,
      equipmentAvailable,
      spaceType,
      primaryGoals,
    },
    update: { trainingDaysPerWeek, sessionMinutesBudget, equipmentAvailable, spaceType, primaryGoals },
  });

  await prisma.$transaction(
    entries.map((flag) =>
      prisma.userHealthFlag.upsert({
        where: { userId_flagType: { userId, flagType: flag.flagType } },
        create: { userId, flagType: flag.flagType, active: flag.active },
        update: { active: flag.active },
      })
    )
  );

  return NextResponse.json({ ok: true });
}

export type ResourcesGoalsBody = z.infer<typeof bodySchema>;
