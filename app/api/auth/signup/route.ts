import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSessionCookie } from "@/lib/session";
import { signupSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const existing = await prisma.appUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.appUser.create({ data: { email, passwordHash } });
  await createSessionCookie(user.id, user.sessionVersion);

  return NextResponse.json({ ok: true });
}
