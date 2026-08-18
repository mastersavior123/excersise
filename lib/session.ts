import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

// 자체 구현한 서명 쿠키 세션. 이유: Phase 1은 OAuth 제공자 secret이 필요 없는 이메일/비밀번호
// 가입만 지원하므로, NextAuth 전체 어댑터(Account/Session 테이블 포함)를 들이는 대신
// HMAC 서명 쿠키 하나로 충분하다고 판단했다. userId만 담고 별도 세션 테이블은 두지 않는다 —
// 로그아웃은 클라이언트 쿠키 삭제로 처리하며, 서버 측 세션 무효화가 필요해지면(Phase 2+) 재검토한다.

const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30일

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET 환경변수가 설정되지 않았거나 너무 짧습니다 (16자 이상 필요)");
  }
  return secret;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
}

interface SessionPayload {
  userId: string;
  issuedAt: number;
}

export async function createSessionCookie(userId: string): Promise<void> {
  const payload: SessionPayload = { userId, issuedAt: Date.now() };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `${payloadB64}.${sign(payloadB64)}`;

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const payloadB64 = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  const expected = sign(payloadB64);
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8")) as SessionPayload;
    if (Date.now() - payload.issuedAt > MAX_AGE_SECONDS * 1000) return null;
    return payload.userId;
  } catch {
    return null;
  }
}
