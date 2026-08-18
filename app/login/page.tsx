import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="container">
      <h1>로그인</h1>
      <div className="card">
        <AuthForm mode="login" />
      </div>
      <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
        계정이 없으신가요? <Link href="/signup">회원가입</Link>
      </p>
    </div>
  );
}
