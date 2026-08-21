"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProgramShareControlProps {
  programId: string;
  initialIsPublic: boolean;
  initialShareToken: string | null;
}

export default function ProgramShareControl({
  programId,
  initialIsPublic,
  initialShareToken,
}: ProgramShareControlProps) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function callShareApi(action: "enable" | "regenerate" | "disable") {
    setError(null);
    setSubmitting(true);
    setCopied(false);
    try {
      const res = await fetch(`/api/program/${programId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "요청에 실패했습니다");
        return;
      }
      setIsPublic(data.isPublic);
      setShareToken(data.shareToken);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  const shareUrl =
    shareToken && typeof window !== "undefined" ? `${window.location.origin}/share/${shareToken}` : null;

  return (
    <div>
      {error && (
        <div className="error-banner" style={{ marginBottom: "0.7rem" }}>
          {error}
        </div>
      )}
      {isPublic && shareUrl ? (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <input type="text" readOnly value={shareUrl} style={{ flex: "1 1 260px", fontSize: "0.82rem" }} />
          <button
            type="button"
            className="secondary"
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl).then(() => setCopied(true));
            }}
          >
            {copied ? "복사됨" : "링크 복사"}
          </button>
          <button type="button" className="secondary" disabled={submitting} onClick={() => callShareApi("regenerate")}>
            재발급
          </button>
          <button type="button" className="secondary" disabled={submitting} onClick={() => callShareApi("disable")}>
            비공개로 전환
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap" }}>
          <p className="lede" style={{ margin: 0 }}>
            아직 공개되지 않았습니다. 링크를 만들면 로그인 없이 누구나 이 프로그램을 읽기 전용으로
            볼 수 있습니다(완료 로그·코치 검수는 제외).
          </p>
          <button type="button" disabled={submitting} onClick={() => callShareApi("enable")}>
            공개 링크 생성
          </button>
        </div>
      )}
    </div>
  );
}
