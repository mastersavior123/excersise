import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DAY_TYPE_LABELS, LEDGER_LABELS } from "@/lib/engine/format";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      weeks: {
        orderBy: { weekIndex: "asc" },
        include: {
          ledgers: true,
          days: {
            orderBy: { date: "asc" },
            include: { log: true },
          },
        },
      },
    },
  });

  if (!program || program.userId !== user.id) notFound();

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
        <h1>4주 프로그램</h1>
        <p className="lede">
          Level {program.level} · 주 {program.frequency}일 · 시작일 {toDateKey(program.startDate)}
        </p>

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
                      href={`/program/${program.id}/day/${day.id}`}
                      className={`cal-cell ${day.dayType}`}
                      key={offset}
                    >
                      <span className="date-num">{date.getUTCDate()}</span>
                      <span className="badge">{DAY_TYPE_LABELS[day.dayType] ?? day.dayType}</span>
                      {day.log?.completed && <span className="done-mark">✓ 완료</span>}
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
