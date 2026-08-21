import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { programShareSchema } from "@/lib/validation";

function generateToken(): string {
  return randomBytes(9).toString("base64url");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { id } = await params;
  const program = await prisma.program.findUnique({
    where: { id },
    select: { id: true, userId: true, isPublic: true, shareToken: true, sharedAt: true },
  });
  // 공유 여부는 소유자 본인만 결정한다 — 코치도 예외 없음(읽기 전용 열람 권한과는 별개).
  if (!program || program.userId !== userId) {
    return NextResponse.json({ error: "찾을 수 없습니다" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = programShareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" }, { status: 400 });
  }

  if (parsed.data.action === "disable") {
    const updated = await prisma.program.update({
      where: { id },
      data: { isPublic: false, shareToken: null },
    });
    return NextResponse.json({ ok: true, isPublic: updated.isPublic, shareToken: updated.shareToken });
  }

  // enable/regenerate 둘 다 새 토큰을 발급한다. sharedAt은 최초 공개 시점만 기록하고
  // 재발급으로는 갱신하지 않는다 — 피드 정렬 기준이 "링크를 새로 뽑은 시각"이 아니라
  // "처음 공개한 시각"이어야 하기 때문이다.
  const updated = await prisma.program.update({
    where: { id },
    data: {
      isPublic: true,
      shareToken: generateToken(),
      sharedAt: program.sharedAt ?? new Date(),
    },
  });
  return NextResponse.json({ ok: true, isPublic: updated.isPublic, shareToken: updated.shareToken });
}
