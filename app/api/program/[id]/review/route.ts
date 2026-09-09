import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, isCoach } from "@/lib/auth";
import { programReviewSchema } from "@/lib/validation";
import { notify } from "@/lib/notifications";
import { PROGRAM_REVIEW_VERDICT_LABELS, type ProgramReviewVerdict } from "@/lib/constants";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  if (!isCoach(user)) {
    return NextResponse.json({ error: "코치만 검수를 남길 수 있습니다" }, { status: 403 });
  }

  const { id } = await params;
  const program = await prisma.program.findUnique({ where: { id }, select: { id: true, userId: true } });
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

  // Phase 7: 검수 결과가 사용자에게 실제로 닿도록 앱 내 알림 (코치가 자기 프로그램을 검수하는 경우는 제외)
  if (program.userId !== user.id) {
    const label = PROGRAM_REVIEW_VERDICT_LABELS[verdict as ProgramReviewVerdict] ?? verdict;
    await notify(
      program.userId,
      "program_review",
      `코치가 프로그램을 검수했습니다: ${label}${comment ? ` — ${comment.slice(0, 80)}` : ""}`,
      `/program/${id}`
    );
  }

  return NextResponse.json({ ok: true, review });
}
