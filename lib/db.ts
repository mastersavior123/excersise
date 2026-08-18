import { PrismaClient } from "@prisma/client";

// Next.js dev 모드의 핫 리로드마다 새 PrismaClient가 생기는 것을 막기 위한 표준 싱글턴 패턴.
// scripts/lib/prisma.ts는 한 번 실행하고 종료하는 CLI 스크립트용이라 이 가드가 필요 없어 분리했다.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
