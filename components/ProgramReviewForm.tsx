"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PROGRAM_REVIEW_VERDICTS, PROGRAM_REVIEW_VERDICT_LABELS, type ProgramReviewVerdict } from "@/lib/constants";

export default function ProgramReviewForm({ programId }: { programId: string }) {
  const router = useRouter();
  const [verdict, setVerdict] = useState<ProgramReviewVerdict>("approved");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/program/${programId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict, comment: comment || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "제출에 실패했습니다");
        return;
      }
      setComment("");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ gap: "0.7rem", marginBottom: "1.25rem" }}>
      {error && <div className="error-banner">{error}</div>}
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        <select value={verdict} onChange={(e) => setVerdict(e.target.value as ProgramReviewVerdict)}>
          {PROGRAM_REVIEW_VERDICTS.map((v) => (
            <option key={v} value={v}>
              {PROGRAM_REVIEW_VERDICT_LABELS[v]}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="코멘트 (선택)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{ flex: "1 1 240px" }}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? "제출 중..." : "검수 제출"}
        </button>
      </div>
    </form>
  );
}
