import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isOnboardingComplete } from "@/lib/onboardingStatus";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    const complete = await isOnboardingComplete(user.id);
    redirect(complete ? "/dashboard" : "/onboarding");
  }

  return (
    <div className="container">
      <h1>WOD Compiler</h1>
      <p className="lede">
        나이·직업·신체정보·5대 리프트(스쿼트·데드리프트·숄더프레스·클린·스내치) 1RM을 입력하면
        그 정보를 바탕으로 월간 크로스핏 프로그램을 자동 구성합니다. (Phase 1: 회원가입·온보딩)
      </p>
      <div className="card" style={{ display: "flex", gap: "0.75rem" }}>
        <Link href="/signup">
          <button>회원가입</button>
        </Link>
        <Link href="/login">
          <button className="secondary">로그인</button>
        </Link>
      </div>
    </div>
  );
}
