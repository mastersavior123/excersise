"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarkNotificationsReadButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      await fetch("/api/notifications/read", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" className="secondary" disabled={disabled || busy} onClick={run}>
      모두 읽음
    </button>
  );
}
