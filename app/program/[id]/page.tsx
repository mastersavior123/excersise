import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, isCoach } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DAY_TYPE_LABELS, LEDGER_LABELS, TRIGGER_RULE_LABELS } from "@/lib/engine/format";
import { PROGRAM_REVIEW_VERDICT_LABELS, type ProgramReviewVerdict } from "@/lib/constants";
import ProgramReviewForm from "@/components/ProgramReviewForm";
import ProgramShareControl from "@/components/ProgramShareControl";

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
      adjustmentEvents: { orderBy: { createdAt: "desc" } },
      reviews: { orderBy: { createdAt: "desc" }, include: { coach: { select: { email: true } } } },
    },
  });

  const isCoachViewing = program?.userId !== user.id && isCoach(user);
  if (!program || (program.userId !== user.id && !isCoachViewing)) notFound();

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
        {isCoachViewing && (
          <div className="warning-banner">
            코치 보기 모드 — 다른 사용자의 프로그램을 읽기 전용으로 보고 있습니다.
          </div>
        )}
        <p className="lede">
          Level {program.level} · 주 {program.frequency}일 · 시작일 {toDateKey(program.startDate)}
        </p>
        <p style={{ marginTop: "-1rem", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
          코치 검수용 내보내기:{" "}
          <a href={`/api/program/${program.id}/export?format=csv`}>CSV 다운로드</a>
          {" · "}
          <a href={`/api/program/${program.id}/export?format=json`}>JSON 다운로드</a>
        </p>

        {!isCoachViewing && (
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h2>공개 공유</h2>
            <ProgramShareControl
              programId={program.id}
              initialIsPublic={program.isPublic}
              initialShareToken={program.shareToken}
            />
          </div>
        )}

        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2>코치 검수</h2>
          {isCoachViewing && <ProgramReviewForm programId={program.id} />}
          {program.reviews.length === 0 ? (
            <p className="lede" style={{ marginBottom: 0 }}>
              아직 코치 검수 기록이 없습니다.
            </p>
          ) : (
            <table className="mini" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>일시</th>
                  <th>코치</th>
                  <th>판정</th>
                  <th>코멘트</th>
                </tr>
              </thead>
              <tbody>
                {program.reviews.map((review) => (
                  <tr key={review.id}>
                    <td>{review.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td>{review.coach.email}</td>
                    <td>
                      <span className={`pill verdict-${review.verdict}`}>
                        {PROGRAM_REVIEW_VERDICT_LABELS[review.verdict as ProgramReviewVerdict] ?? review.verdict}
                      </span>
                    </td>
                    <td>{review.comment ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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

        {program.adjustmentEvents.length > 0 && (
          <div className="card">
            <h2>자동 보정 이력</h2>
            <p className="lede" style={{ marginBottom: "0.8rem" }}>
              생성 시점의 볼륨 장부 조정·연속일 충돌 회피(Phase 7)와, 완료 로그를 저장할 때마다 평가되는
              MD 7장 규칙(Phase 4)·블록 결과 규칙(근력/기술 실패, Phase 7)이 모두 여기에 남는다.
            </p>
            <table className="mini">
              <thead>
                <tr>
                  <th>일시</th>
                  <th>규칙</th>
                  <th>적용된 조정</th>
                </tr>
              </thead>
              <tbody>
                {program.adjustmentEvents.map((event) => (
                  <tr key={event.id}>
                    <td>{event.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td>{TRIGGER_RULE_LABELS[event.triggerRule] ?? event.triggerRule}</td>
                    <td>{event.actionTaken}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
