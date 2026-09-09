import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export type NotificationType = "program_review" | "new_follower";

/** 앱 내 알림 한 건 생성. 알림 실패가 본 동작(검수 저장 등)을 막으면 안 되므로 호출자가 await 후 무시해도 된다. */
export async function notify(
  userId: string,
  type: NotificationType,
  message: string,
  link?: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma
): Promise<void> {
  await tx.notification.create({ data: { userId, type, message, link } });
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
