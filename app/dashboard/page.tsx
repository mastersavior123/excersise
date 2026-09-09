import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isCoach } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isOnboardingComplete } from "@/lib/onboardingStatus";
import { unreadNotificationCount } from "@/lib/notifications";
import LogoutButton from "@/components/LogoutButton";
import LogoutAllButton from "@/components/LogoutAllButton";
import ProgramGenerateButton from "@/components/ProgramGenerateButton";
import {
  GOAL_LABELS,
  HEALTH_FLAG_LABELS,
  LIFT_LABELS,
  LIFTS,
  MOVEMENT_GROUP_LABELS,
  MOVEMENT_GROUPS,
  type Goal,
  type HealthFlagType,
  type Lift,
  type MovementGroup,
} from "@/lib/constants";

const LEVEL_GROUP_LABELS: Record<number, string> = { 1: "초급자", 2: "중급자", 3: "고급자", 4: "선수급" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const complete = await isOnboardingComplete(user.id);
  if (!complete) redirect("/onboarding");

  const [profile, oneRms, capabilities, healthFlags, latestAssessment] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: user.id } }),
    prisma.userOneRM.findMany({ where: { userId: user.id }, orderBy: { measuredAt: "desc" } }),
    prisma.userCapability.findMany({ where: { userId: user.id } }),
    prisma.userHealthFlag.findMany({ where: { userId: user.id } }),
    prisma.userLevelAssessment.findFirst({ where: { userId: user.id }, orderBy: { assessedAt: "desc" } }),
  ]);

  const [programs, unread] = await Promise.all([
    prisma.program.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    unreadNotificationCount(user.id),
  ]);

  const latestOneRmByLift = new Map<string, (typeof oneRms)[number]>();
  for (const rm of oneRms) {
    if (!latestOneRmByLift.has(rm.lift)) latestOneRmByLift.set(rm.lift, rm);
  }

  const activeBlockingFlags = healthFlags.filter(
    (f) => f.active && HEALTH_FLAG_LABELS[f.flagType as HealthFlagType]?.blocking
  );

  return (
    <>
      <div className="topbar">
        <Link href="/dashboard" className="brand">
          WOD Compiler
        </Link>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <Link href="/benchmarks">
            <button className="secondary">오픈 벤치마크</button>
          </Link>
          <Link href="/feed">
            <button className="secondary">피드</button>
          </Link>
          <Link href="/notifications">
            <button className="secondary">알림{unread > 0 ? ` (${unread})` : ""}</button>
          </Link>
          {isCoach(user) && (
            <Link href="/coach">
              <button className="secondary">코치 대시보드</button>
            </Link>
          )}
          <LogoutButton />
        </div>
      </div>
      <div className="container wide">
        <h1>{user.email}</h1>
        {latestAssessment && (
          <div className="level-badge" style={{ marginBottom: "1.5rem" }}>
            Level {latestAssessment.finalLevel} · {LEVEL_GROUP_LABELS[latestAssessment.finalLevel]}
          </div>
        )}

        {activeBlockingFlags.length > 0 && (
          <div className="warning-banner">
            안전 안내: {activeBlockingFlags.map((f) => HEALTH_FLAG_LABELS[f.flagType as HealthFlagType].label).join(", ")}에
            체크하셨습니다. 프로그램 생성 전 전문가 상담을 권장합니다.
          </div>
        )}

        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2>기본 정보</h2>
          <div className="summary-grid">
            <div className="stat">
              <div className="label">나이</div>
              <div className="value">{profile?.age ?? "-"}</div>
            </div>
            <div className="stat">
              <div className="label">체중</div>
              <div className="value">{profile?.weightKg ? `${Number(profile.weightKg)}kg` : "-"}</div>
            </div>
            <div className="stat">
              <div className="label">주간 훈련일</div>
              <div className="value">{profile?.trainingDaysPerWeek ?? "-"}일</div>
            </div>
            <div className="stat">
              <div className="label">세션 시간</div>
              <div className="value">{profile?.sessionMinutesBudget ?? "-"}분</div>
            </div>
          </div>
          <p>
            <strong>우선 목표:</strong>{" "}
            {profile?.primaryGoals.map((g) => GOAL_LABELS[g as Goal] ?? g).join(", ") || "-"}
          </p>
          <p>
            <strong>보유 장비:</strong> {profile?.equipmentAvailable.join(", ") || "-"}
          </p>
        </div>

        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2>5대 리프트 1RM</h2>
          <table className="mini">
            <thead>
              <tr>
                <th>종목</th>
                <th>1RM</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              {LIFTS.map((lift: Lift) => {
                const rm = latestOneRmByLift.get(lift);
                return (
                  <tr key={lift}>
                    <td>{LIFT_LABELS[lift]}</td>
                    <td>{rm ? `${Number(rm.valueKg)}kg` : "-"}</td>
                    <td>{rm?.isEstimated ? "추정치" : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2>월간 프로그램</h2>
          {programs.length === 0 ? (
            <p className="lede" style={{ marginBottom: "1rem" }}>
              아직 생성된 프로그램이 없습니다. 아래 버튼으로 4주 프로그램을 생성해보세요.
            </p>
          ) : (
            <table className="mini" style={{ marginBottom: "1rem" }}>
              <thead>
                <tr>
                  <th>생성일</th>
                  <th>레벨</th>
                  <th>주간 빈도</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => (
                  <tr key={p.id}>
                    <td>{p.createdAt.toISOString().slice(0, 10)}</td>
                    <td>Level {p.level}</td>
                    <td>{p.frequency}일</td>
                    <td>
                      <Link href={`/program/${p.id}`}>보기</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <ProgramGenerateButton />
        </div>

        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2>기술 체크리스트</h2>
          <table className="mini">
            <tbody>
              {MOVEMENT_GROUPS.map((group: MovementGroup) => {
                const cap = capabilities.find((c) => c.movementGroup === group);
                return (
                  <tr key={group}>
                    <td>{MOVEMENT_GROUP_LABELS[group]}</td>
                    <td>{cap?.passed ? "✓ 통과" : "미통과"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>보안</h2>
          <p className="lede" style={{ marginBottom: "0.8rem" }}>
            기기를 잃어버렸거나 공용 PC에서 로그아웃을 잊었다면, 이 계정으로 열려 있는 모든 세션을 한 번에
            끊을 수 있습니다.
          </p>
          <LogoutAllButton />
        </div>
      </div>
    </>
  );
}
