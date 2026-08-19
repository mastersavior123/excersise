"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface TrainingLogFormProps {
  dayId: number;
  initial: {
    completed: boolean;
    rpe: number | null;
    pain: number | null;
    sleepHours: number | null;
    notes: string | null;
  } | null;
}

export default function TrainingLogForm({ dayId, initial }: TrainingLogFormProps) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initial?.completed ?? false);
  const [rpe, setRpe] = useState(initial?.rpe?.toString() ?? "");
  const [pain, setPain] = useState(initial?.pain?.toString() ?? "");
  const [sleepHours, setSleepHours] = useState(initial?.sleepHours?.toString() ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/program/day/${dayId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed,
          rpe: rpe === "" ? null : Number(rpe),
          pain: pain === "" ? null : Number(pain),
          sleepHours: sleepHours === "" ? null : Number(sleepHours),
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다");
        return;
      }
      setSaved(true);
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
        <label htmlFor="pain">통증 (0~10, 선택)</label>
        <input id="pain" type="number" min={0} max={10} value={pain} onChange={(e) => setPain(e.target.value)} />
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
        <span>{saved && !submitting && "저장됨"}</span>
        <button type="submit" disabled={submitting}>
          {submitting ? "저장 중..." : "기록 저장"}
        </button>
      </div>
    </form>
  );
}
