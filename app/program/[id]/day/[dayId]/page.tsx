import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, isCoach } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prescription } from "@/lib/engine/prescribe";
import {
  ADJUST_TAG_LABELS,
  BLOCK_OUTCOME_LABELS,
  DAY_TYPE_LABELS,
  formatPrescription,
  SLOT_LABELS,
} from "@/lib/engine/format";
import TrainingLogForm, { type ResultBlock } from "@/components/TrainingLogForm";

const RESULT_SLOTS = new Set(["main_strength", "skill_power"]);

export default async function ProgramDayPage({
  params,
}: {
  params: Promise<{ id: string; dayId: string }>;
}) {
  const { id, dayId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const day = await prisma.programDay.findUnique({
    where: { id: Number(dayId) },
    include: {
      programWeek: { include: { program: true } },
      log: true,
      blocks: {
        orderBy: { orderIndex: "asc" },
        include: {
          result: true,
          exercise: {
            include: {
              relationsFrom: {
                where: { relationType: "regression" },
                orderBy: { orderIndex: "asc" },
                include: { targetExercise: true },
              },
            },
          },
        },
      },
    },
  });

  const isOwner = day?.programWeek.program.userId === user.id;
  const isCoachViewing = !isOwner && isCoach(user);
  if (!day || (!isOwner && !isCoachViewing) || day.programWeek.programId !== id) notFound();

  const metconCount = day.blocks.filter((b) => b.slot === "metcon").length;
  const firstMetconId = day.blocks.find((b) => b.slot === "metcon")?.id;
  const resultBlocks: ResultBlock[] = day.blocks
    .filter((b) => RESULT_SLOTS.has(b.slot))
    .map((b) => ({
      id: b.id,
      slotLabel: SLOT_LABELS[b.slot] ?? b.slot,
      nameKo: b.exercise.nameKo,
      outcome: (b.result?.outcome as ResultBlock["outcome"]) ?? null,
    }));

  return (
    <>
      <div className="topbar">
        <Link href="/dashboard" className="brand">
          WOD Compiler
        </Link>
        <Link href={`/program/${id}`}>
          <button className="secondary">캘린더로</button>
        </Link>
      </div>
      <div className="container wide">
        <h1>
          {day.date.toISOString().slice(0, 10)}{" "}
          <span className="pill">{DAY_TYPE_LABELS[day.dayType] ?? day.dayType}</span>
        </h1>
        {isCoachViewing && (
          <div className="warning-banner">코치 보기 모드 — 읽기 전용입니다.</div>
        )}
        <p className="lede">
          Week {day.programWeek.weekIndex}
          {day.programWeek.isDeload && " · 디로드 주"}
          {day.conditioningText && (
            <>
              {" · 컨디셔닝 "}
              {day.conditioningText}
              {day.conditioningLowIntensity && (
                <span className="pill" style={{ marginLeft: "0.4rem", fontSize: "0.7rem" }}>
                  저강도(Zone 2)로 전환됨
                </span>
              )}
            </>
          )}
        </p>

        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2>세션</h2>
          {day.blocks.map((block, i) => {
            const prescription = block.prescription as unknown as Prescription;
            const regressions = block.exercise.relationsFrom;
            const tags = prescription.adjustedBy ?? [];
            const regressRecommended = tags.includes("skill_regress_recommended");
            return (
              <div key={block.id}>
                {block.id === firstMetconId && metconCount > 1 && (
                  <p className="hint" style={{ margin: "0.9rem 0 0", fontWeight: 600 }}>
                    메트콘 — {metconCount}동작 조합{day.conditioningText ? ` · 목표 ${day.conditioningText}` : ""}
                  </p>
                )}
                <div
                  style={{
                    padding: "0.9rem 0",
                    borderBottom: i < day.blocks.length - 1 ? "1px solid var(--steel-line)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap" }}>
                    <span className="pill" style={{ fontSize: "0.68rem" }}>
                      {SLOT_LABELS[block.slot] ?? block.slot}
                    </span>
                    <strong>{block.exercise.nameKo}</strong>
                    <span style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>{block.exercise.nameEn}</span>
                    {block.result && (
                      <span className={`pill outcome-${block.result.outcome}`} style={{ fontSize: "0.68rem" }}>
                        {BLOCK_OUTCOME_LABELS[block.result.outcome] ?? block.result.outcome}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: "0.4rem 0" }}>
                    {formatPrescription(prescription)}
                    {tags.map((t) => (
                      <span key={t} className="pill" style={{ marginLeft: "0.5rem", fontSize: "0.68rem" }}>
                        {ADJUST_TAG_LABELS[t] ?? t}
                      </span>
                    ))}
                  </p>

                  <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", fontSize: "0.82rem" }}>
                    {block.exercise.officialYoutubeUrl && (
                      <a href={block.exercise.officialYoutubeUrl} target="_blank" rel="noreferrer">
                        동작 영상 보기 ↗
                      </a>
                    )}
                    {block.exercise.crossfitMovementsUrl && (
                      <a href={block.exercise.crossfitMovementsUrl} target="_blank" rel="noreferrer">
                        CrossFit Movements ↗
                      </a>
                    )}
                  </div>

                  {block.exercise.openWorkouts.length > 0 && (
                    <p className="hint" style={{ marginTop: "0.3rem" }}>
                      오픈 등장: {block.exercise.openWorkouts.join(", ")}
                      {" — "}
                      <Link href="/benchmarks">벤치마크 기록 보기</Link>
                    </p>
                  )}

                  {block.exercise.regressionText && (
                    <p
                      className={regressRecommended ? "warning-banner" : "hint"}
                      style={{ marginTop: "0.4rem", ...(regressRecommended ? { marginBottom: 0, fontSize: "0.85rem" } : {}) }}
                    >
                      {regressRecommended ? "2회 연속 실패 — 이번엔 회귀 버전으로: " : "회귀(쉬운 버전): "}
                      {block.exercise.regressionText}
                      {regressions.length > 0 && (
                        <>
                          {" "}
                          —{" "}
                          {regressions.map((r, idx) => (
                            <span key={r.id}>
                              {idx > 0 && ", "}
                              <strong>{r.targetExercise.nameKo}</strong>
                            </span>
                          ))}{" "}
                          참고 가능 (자극·시간 유지, 처방은 재계산되지 않은 참고용)
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h2>완료 기록</h2>
          {isCoachViewing ? (
            day.log ? (
              <table className="mini">
                <tbody>
                  <tr><td>완료</td><td>{day.log.completed ? "Y" : "N"}</td></tr>
                  <tr><td>RPE</td><td>{day.log.rpe ?? "-"}</td></tr>
                  <tr><td>통증</td><td>{day.log.pain ?? "-"}</td></tr>
                  <tr><td>의욕</td><td>{day.log.motivation ?? "-"}</td></tr>
                  <tr><td>수면시간</td><td>{day.log.sleepHours ? Number(day.log.sleepHours) : "-"}</td></tr>
                  <tr><td>메모</td><td>{day.log.notes ?? "-"}</td></tr>
                  <tr>
                    <td>블록 결과</td>
                    <td>
                      {resultBlocks.filter((b) => b.outcome).length === 0
                        ? "-"
                        : resultBlocks
                            .filter((b) => b.outcome)
                            .map((b) => `${b.nameKo}: ${BLOCK_OUTCOME_LABELS[b.outcome!]}`)
                            .join(", ")}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="lede">아직 기록이 없습니다.</p>
            )
          ) : (
            <TrainingLogForm
              dayId={day.id}
              resultBlocks={resultBlocks}
              initial={
                day.log
                  ? {
                      completed: day.log.completed,
                      rpe: day.log.rpe,
                      pain: day.log.pain,
                      motivation: day.log.motivation,
                      sleepHours: day.log.sleepHours ? Number(day.log.sleepHours) : null,
                      actualDurationMinutes: day.log.actualDurationMinutes,
                      notes: day.log.notes,
                    }
                  : null
              }
            />
          )}
        </div>
      </div>
    </>
  );
}
