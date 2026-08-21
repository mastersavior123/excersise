"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface BenchmarkFormProps {
  year: number;
  workout: string;
  initial: { resultText: string; notes: string | null } | null;
}

export default function BenchmarkForm({ year, workout, initial }: BenchmarkFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(!initial);
  const [resultText, setResultText] = useState(initial?.resultText ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/benchmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, workout, resultText, notes: notes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다");
        return;
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
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.85rem" }}>
        <strong>{resultText}</strong>
        {notes && <span style={{ color: "var(--ink-soft)" }}>{notes}</span>}
        <button type="button" className="secondary" onClick={() => setEditing(true)} style={{ padding: "0.2rem 0.6rem" }}>
          수정
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
      {error && <div className="error-banner" style={{ flexBasis: "100%" }}>{error}</div>}
      <input
        type="text"
        placeholder="결과 (예: 12:34, 185회, 95kg)"
        required
        value={resultText}
        onChange={(e) => setResultText(e.target.value)}
        style={{ maxWidth: "180px" }}
      />
      <input
        type="text"
        placeholder="메모 (선택)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        style={{ maxWidth: "200px" }}
      />
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
