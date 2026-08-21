import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isCoachEmail } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function CoachPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isCoachEmail(user.email)) redirect("/dashboard");

  const users = await prisma.appUser.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      levelAssessments: { orderBy: { assessedAt: "desc" }, take: 1 },
      programs: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { adjustmentEvents: true } } },
      },
    },
  });

  return (
    <>
      <div className="topbar">
        <Link href="/dashboard" className="brand">
          WOD Compiler
        </Link>
        <Link href="/dashboard">
          <button className="secondary">내 대시보드로</button>
        </Link>
      </div>
      <div className="container wide">
        <h1>코치 대시보드</h1>
        <p className="lede">
          <code>COACH_EMAILS</code> 환경변수에 등록된 이메일만 이 페이지를 볼 수 있다. 별도 가입
          승인·역할 관리 없이 운영자가 직접 관리하는 allowlist라, 실제 코치 온보딩이 필요해지면
          진짜 권한 체계로 바꿔야 한다.
        </p>
        <div className="card">
          <table className="mini">
            <thead>
              <tr>
                <th>이메일</th>
                <th>레벨</th>
                <th>프로그램 수</th>
                <th>최신 프로그램</th>
                <th>자동조정 누적</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const level = u.levelAssessments[0]?.finalLevel;
                const latestProgram = u.programs[0];
                const totalAdjustments = u.programs.reduce((sum, p) => sum + p._count.adjustmentEvents, 0);
                return (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{level ?? "-"}</td>
                    <td>{u.programs.length}</td>
                    <td>
                      {latestProgram ? (
                        <Link href={`/program/${latestProgram.id}`}>
                          {latestProgram.createdAt.toISOString().slice(0, 10)}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{totalAdjustments > 0 ? totalAdjustments : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
