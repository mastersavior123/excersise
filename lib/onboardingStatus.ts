import { prisma } from "./db";
import { LIFTS, MOVEMENT_GROUPS } from "./constants";

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const [profile, oneRmCount, capabilityCount, assessmentCount] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.userOneRM.groupBy({ by: ["lift"], where: { userId } }).then((rows) => rows.length),
    prisma.userCapability.count({ where: { userId } }),
    prisma.userLevelAssessment.count({ where: { userId } }),
  ]);

  if (!profile) return false;
  const hasBasicInfo = profile.age !== null && profile.weightKg !== null;
  const hasResourcesGoals =
    profile.trainingDaysPerWeek !== null && profile.primaryGoals.length > 0 && profile.sessionMinutesBudget !== null;

  return (
    hasBasicInfo &&
    hasResourcesGoals &&
    oneRmCount >= LIFTS.length &&
    capabilityCount >= MOVEMENT_GROUPS.length &&
    assessmentCount > 0
  );
}
