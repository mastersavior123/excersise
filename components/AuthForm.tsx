"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface AuthFormProps {
  mode: "signup" | "login";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "요청을 처리하지 못했습니다");
        return;
      }
      router.push(mode === "signup" ? "/onboarding" : "/");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label htmlFor="email">이메일</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="password">비밀번호</label>
        <input
          id="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "signup" && <span className="hint">8자 이상</span>}
      </div>
      <button type="submit" disabled={submitting}>
        {submitting ? "처리 중..." : mode === "signup" ? "회원가입" : "로그인"}
      </button>
    </form>
  );
}
