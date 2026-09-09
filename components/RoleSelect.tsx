"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LABELS: Record<string, string> = { user: "사용자", coach: "코치", admin: "관리자" };

export default function RoleSelect({ userId, initialRole }: { userId: string; initialRole: string }) {
  const router = useRouter();
  const [role, setRole] = useState(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "실패");
        return;
      }
      setRole(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: "0.2rem" }}>
      <select value={role} disabled={busy} onChange={(e) => change(e.target.value)} style={{ padding: "0.25rem 0.4rem" }}>
        {Object.entries(LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {error && <span style={{ color: "var(--danger)", fontSize: "0.75rem" }}>{error}</span>}
    </span>
  );
}
