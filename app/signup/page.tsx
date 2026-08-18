import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <div className="container">
      <h1>회원가입</h1>
      <p className="lede">가입 후 바로 온보딩(기본정보·1RM·기술체크)으로 이동합니다.</p>
      <div className="card">
        <AuthForm mode="signup" />
      </div>
      <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
        이미 계정이 있으신가요? <Link href="/login">로그인</Link>
      </p>
    </div>
  );
}
