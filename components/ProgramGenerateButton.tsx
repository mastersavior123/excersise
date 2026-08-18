"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProgramGenerateButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/program/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "프로그램 생성에 실패했습니다");
        return;
      }
      router.push(`/program/${data.programId}`);
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <div className="error-banner" style={{ marginBottom: "0.8rem" }}>{error}</div>}
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "생성 중..." : "4주 프로그램 생성"}
      </button>
    </div>
  );
}
