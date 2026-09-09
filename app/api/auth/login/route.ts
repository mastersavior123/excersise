import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSessionCookie } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

const GENERIC_ERROR = "이메일 또는 비밀번호가 올바르지 않습니다";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.appUser.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  await createSessionCookie(user.id, user.sessionVersion);
  return NextResponse.json({ ok: true });
}
