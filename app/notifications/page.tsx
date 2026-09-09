import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import MarkNotificationsReadButton from "@/components/MarkNotificationsReadButton";

const TYPE_LABELS: Record<string, string> = { program_review: "코치 검수", new_follower: "새 팔로워" };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <>
      <div className="topbar">
        <Link href="/dashboard" className="brand">
          WOD Compiler
        </Link>
        <Link href="/dashboard">
          <button className="secondary">대시보드로</button>
        </Link>
      </div>
      <div className="container wide">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem" }}>
          <h1>알림 {unread > 0 && <span className="level-badge">{unread}</span>}</h1>
          <MarkNotificationsReadButton disabled={unread === 0} />
        </div>
        <p className="lede">코치 검수가 남거나 누군가 나를 팔로우하면 여기에 쌓인다. 이메일·푸시 알림은 없다.</p>
        <div className="card">
          {items.length === 0 ? (
            <p className="lede" style={{ marginBottom: 0 }}>
              아직 알림이 없습니다.
            </p>
          ) : (
            <table className="mini" style={{ marginBottom: 0 }}>
              <tbody>
                {items.map((n) => (
                  <tr key={n.id} style={n.readAt ? { color: "var(--ink-soft)" } : { fontWeight: 600 }}>
                    <td style={{ whiteSpace: "nowrap" }}>{n.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td>
                      <span className="pill" style={{ fontSize: "0.65rem" }}>
                        {TYPE_LABELS[n.type] ?? n.type}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "normal" }}>{n.link ? <Link href={n.link}>{n.message}</Link> : n.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
