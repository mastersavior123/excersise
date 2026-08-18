import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { basicInfoSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = basicInfoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" }, { status: 400 });
  }
  const { age, gender, occupationActivity, heightCm, weightKg, recentTrainingFrequency } = parsed.data;

  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, age, gender, occupationActivity, heightCm, weightKg, recentTrainingFrequency },
    update: { age, gender, occupationActivity, heightCm, weightKg, recentTrainingFrequency },
  });

  return NextResponse.json({ ok: true });
}
