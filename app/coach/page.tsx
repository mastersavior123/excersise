import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin, isBootstrapAdminEmail, isCoach } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PROGRAM_REVIEW_VERDICT_LABELS, type ProgramReviewVerdict } from "@/lib/constants";
import RoleSelect from "@/components/RoleSelect";

const ROLE_LABELS: Record<string, string> = { user: "사용자", coach: "코치", admin: "관리자" };

export default async function CoachPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isCoach(user)) redirect("/dashboard");
  const admin = isAdmin(user);

  const users = await prisma.appUser.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      levelAssessments: { orderBy: { assessedAt: "desc" }, take: 1 },
      programs: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { adjustmentEvents: true } },
          reviews: { orderBy: { createdAt: "desc" }, take: 1 },
        },
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
          역할이 코치/관리자인 계정만 이 페이지를 볼 수 있다. 관리자는 아래 표에서 다른 사용자의 역할을
          바로 바꿀 수 있고, <code>COACH_EMAILS</code> 환경변수는 첫 관리자를 만드는 부트스트랩
          용도로만 남아 있다(거기 적힌 이메일은 항상 관리자로 취급).
        </p>
        <div className="card">
          <table className="mini">
            <thead>
              <tr>
                <th>이메일</th>
                <th>역할</th>
                <th>레벨</th>
                <th>프로그램 수</th>
                <th>최신 프로그램</th>
                <th>최신 검수</th>
                <th>자동조정 누적</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const level = u.levelAssessments[0]?.finalLevel;
                const latestProgram = u.programs[0];
                const latestReview = latestProgram?.reviews[0];
                const totalAdjustments = u.programs.reduce((sum, p) => sum + p._count.adjustmentEvents, 0);
                return (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>
                      {admin ? (
                        <RoleSelect userId={u.id} initialRole={u.role} />
                      ) : (
                        ROLE_LABELS[u.role] ?? u.role
                      )}
                      {isBootstrapAdminEmail(u.email) && (
                        <span className="hint" style={{ marginLeft: "0.4rem" }}>(env)</span>
                      )}
                    </td>
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
                    <td>
                      {latestReview ? (
                        <span className={`pill verdict-${latestReview.verdict}`}>
                          {PROGRAM_REVIEW_VERDICT_LABELS[latestReview.verdict as ProgramReviewVerdict] ??
                            latestReview.verdict}
                        </span>
                      ) : latestProgram ? (
                        "미검수"
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
