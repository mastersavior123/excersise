"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const STATUSES: { value: string; label: string }[] = [
  { value: "approved", label: "승인" },
  { value: "needs_change", label: "수정 요청" },
  { value: "pending", label: "미검수로 되돌림" },
];

export default function ParameterReviewForm({
  assumptionKey,
  initialStatus,
  initialNote,
}: {
  assumptionKey: string;
  initialStatus: string;
  initialNote: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus === "pending" ? "approved" : initialStatus);
  const [note, setNote] = useState(initialNote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/parameter-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: assumptionKey, status, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "실패");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ gap: "0.4rem", marginTop: "0.5rem" }}>
      {error && <div className="error-banner">{error}</div>}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: "0.3rem 0.5rem" }}>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="검수 메모 (예: 데드리프트 W3 78%는 초급자에게 높음)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ flex: "1 1 260px", fontSize: "0.85rem" }}
        />
        <button type="submit" disabled={busy} style={{ padding: "0.35rem 0.8rem" }}>
          저장
        </button>
      </div>
    </form>
  );
}
