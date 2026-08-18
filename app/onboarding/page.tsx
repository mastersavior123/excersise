import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import OnboardingWizard, { type OnboardingInitialData } from "@/components/OnboardingWizard";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, oneRms, capabilities, healthFlags] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: user.id } }),
    prisma.userOneRM.findMany({ where: { userId: user.id }, orderBy: { measuredAt: "desc" } }),
    prisma.userCapability.findMany({ where: { userId: user.id } }),
    prisma.userHealthFlag.findMany({ where: { userId: user.id } }),
  ]);

  // lift당 최신 값만 클라이언트로 넘긴다 (measuredAt desc 정렬이므로 첫 등장이 최신)
  const latestOneRmByLift = new Map<string, (typeof oneRms)[number]>();
  for (const rm of oneRms) {
    if (!latestOneRmByLift.has(rm.lift)) latestOneRmByLift.set(rm.lift, rm);
  }

  // Prisma Decimal은 그대로 클라이언트 컴포넌트에 직렬화할 수 없어 number/string으로 변환한다.
  const initialData: OnboardingInitialData = {
    profile: profile
      ? {
          age: profile.age,
          gender: profile.gender,
          occupationActivity: profile.occupationActivity,
          heightCm: profile.heightCm ? Number(profile.heightCm) : null,
          weightKg: profile.weightKg ? Number(profile.weightKg) : null,
          recentTrainingFrequency: profile.recentTrainingFrequency,
          trainingDaysPerWeek: profile.trainingDaysPerWeek,
          sessionMinutesBudget: profile.sessionMinutesBudget,
          equipmentAvailable: profile.equipmentAvailable,
          spaceType: profile.spaceType,
          primaryGoals: profile.primaryGoals,
        }
      : null,
    oneRms: Array.from(latestOneRmByLift.values()).map((rm) => ({
      lift: rm.lift,
      valueKg: Number(rm.valueKg),
      isEstimated: rm.isEstimated,
    })),
    capabilities: capabilities.map((c) => ({ movementGroup: c.movementGroup, passed: c.passed })),
    healthFlags: healthFlags.map((f) => ({ flagType: f.flagType, active: f.active })),
  };

  return (
    <div className="container wide">
      <h1>온보딩</h1>
      <p className="lede">기본정보 → 1RM → 기술 체크 → 가용자원·목표 순으로 입력합니다. 언제든 나갔다 와도 저장된 단계부터 이어집니다.</p>
      <OnboardingWizard initialData={initialData} />
    </div>
  );
}
