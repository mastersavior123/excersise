import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

// 자체 구현한 서명 쿠키 세션. 이유: Phase 1은 OAuth 제공자 secret이 필요 없는 이메일/비밀번호
// 가입만 지원하므로, NextAuth 전체 어댑터(Account/Session 테이블 포함)를 들이는 대신
// HMAC 서명 쿠키 하나로 충분하다고 판단했다. 별도 세션 테이블은 두지 않는다.
// Phase 7: 서버 측 무효화는 페이로드에 app_user.session_version을 함께 넣어 해결했다 —
// lib/auth.ts가 DB 값과 비교하므로 "모든 기기에서 로그아웃"은 그 숫자를 올리기만 하면 된다.
// 세션 테이블을 도입하지 않은 이유: 기기별 개별 로그아웃까지는 아직 요구가 없고,
// 버전 하나로 "전부 끊기"는 충분히 해결되기 때문이다.

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

export interface SessionPayload {
  userId: string;
  issuedAt: number;
  sessionVersion: number;
}

export async function createSessionCookie(userId: string, sessionVersion: number): Promise<void> {
  const payload: SessionPayload = { userId, issuedAt: Date.now(), sessionVersion };
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

/** 서명·만료만 검증한 페이로드. session_version 비교는 lib/auth.ts에서 DB와 대조한다. */
export async function getSessionPayload(): Promise<SessionPayload | null> {
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
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8")) as Partial<SessionPayload>;
    if (typeof payload.userId !== "string" || typeof payload.issuedAt !== "number") return null;
    if (Date.now() - payload.issuedAt > MAX_AGE_SECONDS * 1000) return null;
    // Phase 7 이전에 발급된 쿠키(sessionVersion 없음)는 0으로 간주 — 기존 로그인이 끊기지 않게.
    return { userId: payload.userId, issuedAt: payload.issuedAt, sessionVersion: payload.sessionVersion ?? 0 };
  } catch {
    return null;
  }
}
