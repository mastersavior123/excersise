import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prescription } from "@/lib/engine/prescribe";
import { DAY_TYPE_LABELS, formatPrescription, LEDGER_LABELS, SLOT_LABELS } from "@/lib/engine/format";

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
            include: {
              blocks: { orderBy: { orderIndex: "asc" }, include: { exercise: true } },
              template: true,
            },
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
          Level {program.level} · 주 {program.frequency}일 · 시작일 {program.startDate.toISOString().slice(0, 10)}
        </p>

        {program.weeks.map((week) => (
          <div className="card" key={week.id} style={{ marginBottom: "1.5rem" }}>
            <h2>
              Week {week.weekIndex} {week.isDeload && <span className="level-badge">디로드</span>}
            </h2>

            <div className="summary-grid" style={{ marginBottom: "1.2rem" }}>
              {week.ledgers.map((l) => (
                <div className="stat" key={l.id}>
                  <div className="label">{LEDGER_LABELS[l.ledgerId] ?? l.ledgerId}</div>
                  <div className="value">
                    {Number(l.plannedValue).toFixed(1)}
                    <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "var(--ink-soft)" }}>
                      {" "}
                      / {Number(l.minValue)}~{Number(l.maxValue)}
                    </span>
                  </div>
                  {!l.withinRange && <div className="flag-caution">범위 밖</div>}
                </div>
              ))}
            </div>

            {week.days.map((day) => (
              <div key={day.id} style={{ marginBottom: "1.2rem" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  {day.date.toISOString().slice(0, 10)}
                  <span className="pill" style={{ fontSize: "0.7rem" }}>
                    {DAY_TYPE_LABELS[day.dayType] ?? day.dayType}
                  </span>
                </h3>
                <table className="mini">
                  <thead>
                    <tr>
                      <th>슬롯</th>
                      <th>운동</th>
                      <th>처방</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.blocks.map((block) => (
                      <tr key={block.id}>
                        <td>{SLOT_LABELS[block.slot] ?? block.slot}</td>
                        <td>{block.exercise.nameKo}</td>
                        <td>{formatPrescription(block.prescription as unknown as Prescription)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
