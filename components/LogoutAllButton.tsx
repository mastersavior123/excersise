"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutAllButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!confirm("이 계정으로 로그인된 모든 기기(지금 이 브라우저 포함)에서 로그아웃합니다. 계속할까요?")) return;
    setLoading(true);
    await fetch("/api/auth/logout-all", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" className="secondary" onClick={handle} disabled={loading}>
      {loading ? "..." : "모든 기기에서 로그아웃"}
    </button>
  );
}
