"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface BenchmarkFormProps {
  year: number;
  workout: string;
  initial: { resultText: string; notes: string | null; isPublic: boolean; scaled: boolean; parsedLabel: string | null } | null;
}

export default function BenchmarkForm({ year, workout, initial }: BenchmarkFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(!initial);
  const [resultText, setResultText] = useState(initial?.resultText ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false);
  const [scaled, setScaled] = useState(initial?.scaled ?? false);
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setWarn(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/benchmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, workout, resultText, notes: notes || undefined, isPublic, scaled }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다");
        return;
      }
      if (!data.parsedKind) {
        setWarn("저장은 됐지만 결과를 숫자로 해석하지 못해 리더보드에는 '미분류'로 표시됩니다 (예: 12:34, 185회, 5+10, 95kg).");
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", flexWrap: "wrap" }}>
        <strong>{resultText}</strong>
        {initial?.parsedLabel && <span className="hint">({initial.parsedLabel})</span>}
        <span className="pill" style={{ fontSize: "0.65rem" }}>{scaled ? "Scaled" : "Rx"}</span>
        <span className="pill" style={{ fontSize: "0.65rem" }}>{isPublic ? "공개" : "비공개"}</span>
        {notes && <span style={{ color: "var(--ink-soft)" }}>{notes}</span>}
        {warn && <span className="hint" style={{ flexBasis: "100%" }}>{warn}</span>}
        <button type="button" className="secondary" onClick={() => setEditing(true)} style={{ padding: "0.2rem 0.6rem" }}>
          수정
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
      {error && <div className="error-banner" style={{ flexBasis: "100%" }}>{error}</div>}
      <input
        type="text"
        placeholder="결과 (12:34 · 185회 · 5+10 · 95kg)"
        required
        value={resultText}
        onChange={(e) => setResultText(e.target.value)}
        style={{ maxWidth: "190px" }}
      />
      <input
        type="text"
        placeholder="메모 (선택)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        style={{ maxWidth: "160px" }}
      />
      <label style={{ fontSize: "0.8rem", display: "inline-flex", gap: "0.25rem", alignItems: "center" }}>
        <input type="checkbox" checked={scaled} onChange={(e) => setScaled(e.target.checked)} /> Scaled
      </label>
      <label style={{ fontSize: "0.8rem", display: "inline-flex", gap: "0.25rem", alignItems: "center" }}>
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> 공개(리더보드·피드)
      </label>
      <button type="submit" disabled={submitting} style={{ padding: "0.4rem 0.8rem" }}>
        {submitting ? "저장 중..." : "저장"}
      </button>
      {initial && (
        <button type="button" className="secondary" onClick={() => setEditing(false)} style={{ padding: "0.4rem 0.8rem" }}>
          취소
        </button>
      )}
    </form>
  );
}
