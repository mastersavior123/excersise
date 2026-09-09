import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, isCoach } from "@/lib/auth";
import { listAssumptions, PARAMETER_REVIEW_STATUSES } from "@/lib/assumptions";

const bodySchema = z.object({
  key: z.string().min(1),
  status: z.enum(PARAMETER_REVIEW_STATUSES),
  note: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  if (!isCoach(user)) return NextResponse.json({ error: "코치만 검수할 수 있습니다" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "입력값이 올바르지 않습니다" }, { status: 400 });
  const { key, status, note } = parsed.data;

  if (!listAssumptions().some((a) => a.key === key)) {
    return NextResponse.json({ error: "존재하지 않는 항목입니다" }, { status: 404 });
  }

  const review = await prisma.parameterReview.upsert({
    where: { key },
    create: { key, status, note, reviewedById: user.id },
    update: { status, note, reviewedById: user.id },
  });
  return NextResponse.json({ ok: true, review });
}
