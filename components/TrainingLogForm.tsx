"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface AppliedAdjustment {
  triggerRule: string;
  actionTaken: string;
}

export interface ResultBlock {
  id: number;
  slotLabel: string;
  nameKo: string;
  outcome: "success" | "partial" | "failed" | null;
}

interface TrainingLogFormProps {
  dayId: number;
  /** 결과를 남길 수 있는 블록(주근력·기술). Phase 7 근력/기술 실패 규칙의 입력. */
  resultBlocks: ResultBlock[];
  initial: {
    completed: boolean;
    rpe: number | null;
    pain: number | null;
    motivation: number | null;
    sleepHours: number | null;
    actualDurationMinutes: number | null;
    notes: string | null;
  } | null;
}

const OUTCOME_OPTIONS: { value: ResultBlock["outcome"]; label: string }[] = [
  { value: null, label: "미기록" },
  { value: "success", label: "성공" },
  { value: "partial", label: "부분" },
  { value: "failed", label: "실패" },
];

export default function TrainingLogForm({ dayId, resultBlocks, initial }: TrainingLogFormProps) {
  const router = useRouter();
  const [outcomes, setOutcomes] = useState<Record<number, ResultBlock["outcome"]>>(
    Object.fromEntries(resultBlocks.map((b) => [b.id, b.outcome]))
  );
  const [completed, setCompleted] = useState(initial?.completed ?? false);
  const [rpe, setRpe] = useState(initial?.rpe?.toString() ?? "");
  const [pain, setPain] = useState(initial?.pain?.toString() ?? "");
  const [motivation, setMotivation] = useState(initial?.motivation?.toString() ?? "");
  const [sleepHours, setSleepHours] = useState(initial?.sleepHours?.toString() ?? "");
  const [actualDurationMinutes, setActualDurationMinutes] = useState(
    initial?.actualDurationMinutes?.toString() ?? ""
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [adjustments, setAdjustments] = useState<AppliedAdjustment[]>([]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setAdjustments([]);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/program/day/${dayId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed,
          rpe: rpe === "" ? null : Number(rpe),
          pain: pain === "" ? null : Number(pain),
          motivation: motivation === "" ? null : Number(motivation),
          sleepHours: sleepHours === "" ? null : Number(sleepHours),
          actualDurationMinutes: actualDurationMinutes === "" ? null : Number(actualDurationMinutes),
          notes: notes || undefined,
          blockResults: resultBlocks.map((b) => ({ blockId: b.id, outcome: outcomes[b.id] ?? null })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다");
        return;
      }
      setSaved(true);
      setAdjustments(data.adjustments ?? []);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}
      {adjustments.length > 0 && (
        <div className="warning-banner">
          {adjustments.map((a, i) => (
            <p key={i} style={{ margin: i === 0 ? 0 : "0.4rem 0 0" }}>
              ⚠ 자동 보정: {a.actionTaken}
            </p>
          ))}
        </div>
      )}
      <p className="hint">
        세션 전/도중 체크인이면 완료 체크는 비워두세요 — 수면·통증·의욕만 입력해도 오늘 세션 볼륨이
        자동으로 낮아질 수 있습니다. 세션 RPE·실제 소요 시간은 완료 후에 입력하면 다음 큰 날의 부하
        조정에 반영됩니다.
      </p>
      {resultBlocks.length > 0 && (
        <div className="field">
          <label>블록 결과 (주근력·기술)</label>
          <p className="hint" style={{ margin: 0 }}>
            처방된 세트·회를 다 채웠으면 성공, 일부만 했으면 부분, 중량/동작을 못 했으면 실패. 근력은 1회 실패
            시 다음 세션 중량을 유지하고 2회 연속이면 7.5% 감량, 기술은 2회 연속 실패 시 회귀 동작으로 바뀝니다.
          </p>
          {resultBlocks.map((b) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", padding: "0.3rem 0" }}>
              <span className="pill" style={{ fontSize: "0.68rem" }}>
                {b.slotLabel}
              </span>
              <span style={{ flex: "1 1 160px", fontSize: "0.9rem" }}>{b.nameKo}</span>
              <span style={{ display: "inline-flex", gap: "0.25rem" }}>
                {OUTCOME_OPTIONS.map((o) => {
                  const active = (outcomes[b.id] ?? null) === o.value;
                  return (
                    <button
                      type="button"
                      key={String(o.value)}
                      className={active ? undefined : "secondary"}
                      onClick={() => setOutcomes((prev) => ({ ...prev, [b.id]: o.value }))}
                      style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="checkbox-row">
        <input
          type="checkbox"
          id="completed"
          checked={completed}
          onChange={(e) => setCompleted(e.target.checked)}
        />
        <label htmlFor="completed" className="label-text">
          이 세션을 완료했습니다
        </label>
      </div>
      <div className="field">
        <label htmlFor="rpe">세션 RPE (1~10, 선택)</label>
        <input id="rpe" type="number" min={1} max={10} value={rpe} onChange={(e) => setRpe(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="duration">실제 소요 시간(분, 선택)</label>
        <input
          id="duration"
          type="number"
          min={0}
          max={600}
          value={actualDurationMinutes}
          onChange={(e) => setActualDurationMinutes(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="pain">통증 (0~10, 선택)</label>
        <input id="pain" type="number" min={0} max={10} value={pain} onChange={(e) => setPain(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="motivation">의욕 (1~10, 선택)</label>
        <input
          id="motivation"
          type="number"
          min={1}
          max={10}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="sleep">전날 수면 시간 (선택)</label>
        <input
          id="sleep"
          type="number"
          min={0}
          max={24}
          step="0.5"
          value={sleepHours}
          onChange={(e) => setSleepHours(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="notes">메모 (선택)</label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ font: "inherit", padding: "0.55rem 0.7rem", border: "1px solid var(--steel-line)", borderRadius: "6px" }}
        />
      </div>
      <div className="actions">
        <span>{saved && !submitting && adjustments.length === 0 && "저장됨"}</span>
        <button type="submit" disabled={submitting}>
          {submitting ? "저장 중..." : "기록 저장"}
        </button>
      </div>
    </form>
  );
}
