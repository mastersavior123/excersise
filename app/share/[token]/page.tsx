import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DAY_TYPE_LABELS, LEDGER_LABELS } from "@/lib/engine/format";
import FollowButton from "@/components/FollowButton";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export default async function SharedProgramPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const program = await prisma.program.findUnique({
    where: { shareToken: token },
    include: {
      user: { select: { id: true } },
      weeks: {
        orderBy: { weekIndex: "asc" },
        include: { ledgers: true, days: { orderBy: { date: "asc" } } },
      },
    },
  });
  if (!program || !program.isPublic) notFound();

  const viewer = await getCurrentUser();
  let alreadyFollowing = false;
  if (viewer && viewer.id !== program.userId) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followeeId: { followerId: viewer.id, followeeId: program.userId } },
    });
    alreadyFollowing = !!follow;
  }

  return (
    <>
      <div className="topbar">
        <Link href="/" className="brand">
          WOD Compiler
        </Link>
        {viewer ? (
          <Link href="/dashboard">
            <button className="secondary">내 대시보드로</button>
          </Link>
        ) : (
          <Link href="/login">
            <button className="secondary">로그인</button>
          </Link>
        )}
      </div>
      <div className="container wide">
        <h1>공개된 4주 프로그램</h1>
        <div className="warning-banner">
          누구나 볼 수 있는 읽기 전용 공개 링크입니다. 완료 로그·코치 검수 같은 개인 데이터는
          포함되지 않습니다.
        </div>
        <p className="lede">
          Level {program.level} · 주 {program.frequency}일 · 시작일 {toDateKey(program.startDate)}
        </p>

        {viewer && viewer.id !== program.userId && (
          <p style={{ marginTop: "-1rem", marginBottom: "1.5rem" }}>
            <FollowButton followeeId={program.userId} initialFollowing={alreadyFollowing} />
            <span className="hint" style={{ marginLeft: "0.6rem" }}>
              팔로우하면 /feed에서 이 사용자의 벤치마크 기록과 다른 공개 프로그램을 볼 수 있습니다.
            </span>
          </p>
        )}
        {!viewer && (
          <p className="lede" style={{ marginTop: "-1rem" }}>
            <Link href="/login">로그인</Link>하면 이 프로그램 작성자를 팔로우할 수 있습니다.
          </p>
        )}

        {program.weeks.map((week) => {
          const weekStart = addDays(program.startDate, (week.weekIndex - 1) * 7);
          const daysByKey = new Map(week.days.map((d) => [toDateKey(d.date), d]));

          return (
            <div className="week-row" key={week.id}>
              <div className="week-row-head">
                <h2 style={{ margin: 0 }}>
                  Week {week.weekIndex} {week.isDeload && <span className="level-badge">디로드</span>}
                </h2>
                <div className="ledger-strip">
                  {week.ledgers.map((l) => (
                    <span key={l.id} className={l.withinRange ? "" : "over"}>
                      {LEDGER_LABELS[l.ledgerId] ?? l.ledgerId} {Number(l.plannedValue).toFixed(1)}
                      {!l.withinRange && ` (범위 ${l.minValue}~${l.maxValue})`}
                    </span>
                  ))}
                </div>
              </div>

              <div className="cal-grid">
                {WEEKDAY_LABELS.map((label) => (
                  <div className="cal-head" key={label}>
                    {label}
                  </div>
                ))}
                {WEEKDAY_LABELS.map((_, offset) => {
                  const date = addDays(weekStart, offset);
                  const day = daysByKey.get(toDateKey(date));
                  if (!day) {
                    return (
                      <div className="cal-cell rest" key={offset}>
                        <span className="date-num">{date.getUTCDate()}</span>
                        <span className="badge">휴식</span>
                      </div>
                    );
                  }
                  return (
                    <Link
                      href={`/share/${token}/day/${day.id}`}
                      className={`cal-cell ${day.dayType}`}
                      key={offset}
                    >
                      <span className="date-num">{date.getUTCDate()}</span>
                      <span className="badge">{DAY_TYPE_LABELS[day.dayType] ?? day.dayType}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
