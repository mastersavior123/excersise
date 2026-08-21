import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import FollowButton from "@/components/FollowButton";

type FeedItem =
  | { kind: "benchmark"; timestamp: Date; email: string; year: number; workout: string; resultText: string }
  | { kind: "share"; timestamp: Date; email: string; shareToken: string; level: number; frequency: number };

export default async function FeedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const follows = await prisma.follow.findMany({
    where: { followerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { followee: { select: { id: true, email: true } } },
  });
  const followeeIds = follows.map((f) => f.followeeId);

  let items: FeedItem[] = [];
  if (followeeIds.length > 0) {
    const [benchmarks, shares] = await Promise.all([
      prisma.benchmarkResult.findMany({
        where: { userId: { in: followeeIds } },
        orderBy: { recordedAt: "desc" },
        take: 20,
        include: { user: { select: { email: true } } },
      }),
      prisma.program.findMany({
        where: { userId: { in: followeeIds }, isPublic: true },
        orderBy: { sharedAt: "desc" },
        take: 20,
        include: { user: { select: { email: true } } },
      }),
    ]);

    items = [
      ...benchmarks.map(
        (b): FeedItem => ({
          kind: "benchmark",
          timestamp: b.recordedAt,
          email: b.user.email,
          year: b.year,
          workout: b.workout,
          resultText: b.resultText,
        })
      ),
      ...shares
        .filter((p) => p.shareToken && p.sharedAt)
        .map(
          (p): FeedItem => ({
            kind: "share",
            timestamp: p.sharedAt as Date,
            email: p.user.email,
            shareToken: p.shareToken as string,
            level: p.level,
            frequency: p.frequency,
          })
        ),
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 30);
  }

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
        <h1>피드</h1>
        <p className="lede">
          팔로우 중인 사용자의 벤치마크 기록과 공개로 전환한 프로그램만 모아 보여준다. 비공개
          프로그램·완료 로그는 팔로우해도 보이지 않는다.
        </p>

        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2>팔로우 중 ({follows.length})</h2>
          {follows.length === 0 ? (
            <p className="lede" style={{ marginBottom: 0 }}>
              아직 아무도 팔로우하지 않았습니다. 다른 사용자의 공개 프로그램 링크(<code>/share/...</code>)를
              열면 팔로우 버튼이 있습니다.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {follows.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                  <span style={{ flex: 1 }}>{f.followee.email}</span>
                  <FollowButton followeeId={f.followeeId} initialFollowing={true} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2>최근 활동</h2>
          {items.length === 0 ? (
            <p className="lede" style={{ marginBottom: 0 }}>
              아직 표시할 활동이 없습니다.
            </p>
          ) : (
            <table className="mini" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>일시</th>
                  <th>사용자</th>
                  <th>활동</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.timestamp.toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td>{item.email}</td>
                    <td>
                      {item.kind === "benchmark" ? (
                        <>
                          {item.year} {item.workout} 기록: <strong>{item.resultText}</strong>
                        </>
                      ) : (
                        <>
                          Level {item.level} · 주 {item.frequency}일 프로그램 공개 —{" "}
                          <Link href={`/share/${item.shareToken}`}>보러 가기</Link>
                        </>
                      )}
                    </td>
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
