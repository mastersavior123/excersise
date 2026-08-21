import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, isCoachEmail } from "@/lib/auth";
import { programReviewSchema } from "@/lib/validation";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  if (!isCoachEmail(user.email)) {
    return NextResponse.json({ error: "코치만 검수를 남길 수 있습니다" }, { status: 403 });
  }

  const { id } = await params;
  const program = await prisma.program.findUnique({ where: { id }, select: { id: true } });
  if (!program) return NextResponse.json({ error: "찾을 수 없습니다" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = programReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" }, { status: 400 });
  }
  const { verdict, comment } = parsed.data;

  const review = await prisma.programReview.create({
    data: { programId: id, coachId: user.id, verdict, comment },
  });

  return NextResponse.json({ ok: true, review });
}
