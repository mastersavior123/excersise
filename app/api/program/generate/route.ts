import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { generateProgram, GenerationBlockedError } from "@/lib/engine/generateProgram";

export async function POST() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  try {
    const programId = await generateProgram(userId);
    return NextResponse.json({ ok: true, programId });
  } catch (err) {
    if (err instanceof GenerationBlockedError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[program/generate]", err);
    const message = err instanceof Error ? err.message : "프로그램 생성에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
