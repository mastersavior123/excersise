import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../lib/prisma";
import { seedExercises } from "./seedExercise";
import { seedExerciseRelations } from "./seedExerciseRelations";
import { seedLevelProfiles } from "./seedLevelProfiles";
import { seedVolumeRules } from "./seedVolumeRules";
import { seedSessionTemplates } from "./seedSessionTemplates";
import { seedGeneratorRules } from "./seedGeneratorRules";
import { seedScalingMap } from "./seedScalingMap";
import { seedEnums } from "./seedEnums";
import { seedOpenWorkouts } from "./seedOpenWorkouts";
import { seedOpenWorkoutMovements } from "./seedOpenWorkoutMovements";
import { seedOfficialVideos } from "./seedOfficialVideos";

const REPORT_PATH = join(import.meta.dirname, "..", "..", "data", "seed-report.json");

async function clearAll() {
  // FK 의존성의 역순으로 비운다.
  await prisma.officialMedia.deleteMany();
  await prisma.openWorkoutMovement.deleteMany();
  await prisma.openWorkout.deleteMany();
  await prisma.scalingMap.deleteMany();
  await prisma.generatorRule.deleteMany();
  await prisma.sessionTemplate.deleteMany();
  await prisma.volumeLedgerRule.deleteMany();
  await prisma.levelProfile.deleteMany();
  await prisma.enumLookup.deleteMany();
  await prisma.exerciseRelation.deleteMany();
  await prisma.exerciseAlias.deleteMany();
  await prisma.exercise.deleteMany();
}

async function main() {
  console.log("[seed] 기존 데이터 초기화...");
  await clearAll();

  console.log("[seed] Exercise_DB 적재...");
  const exerciseCtx = await seedExercises(prisma);
  console.log(`  -> ${exerciseCtx.count}개 운동, ${exerciseCtx.aliasMap.size}개 별칭`);

  console.log("[seed] 회귀/진행 관계 정규화...");
  const relationIssues = await seedExerciseRelations(prisma, exerciseCtx);

  console.log("[seed] Level_Profiles 적재...");
  const levelCount = await seedLevelProfiles(prisma);

  console.log("[seed] Volume_Rules 적재...");
  const volumeCount = await seedVolumeRules(prisma);

  console.log("[seed] Session_Templates 적재...");
  const templateCount = await seedSessionTemplates(prisma);

  console.log("[seed] Generator_Rules 적재...");
  const ruleCount = await seedGeneratorRules(prisma);

  console.log("[seed] Scaling_Map 적재...");
  const scalingIssues = await seedScalingMap(prisma, exerciseCtx);

  console.log("[seed] Enums 적재...");
  const enumCount = await seedEnums(prisma);

  console.log("[seed] Open_Workouts 적재...");
  const openWorkoutCount = await seedOpenWorkouts(prisma);

  console.log("[seed] Open_Movement_Index 적재...");
  const { count: movementCount, issues: movementIssues } = await seedOpenWorkoutMovements(prisma, exerciseCtx);

  console.log("[seed] Official_Videos 적재...");
  const { count: videoCount, issues: videoIssues } = await seedOfficialVideos(prisma, exerciseCtx);

  const summary = {
    seededAt: new Date().toISOString(),
    counts: {
      exercise: exerciseCtx.count,
      exerciseAlias: exerciseCtx.aliasMap.size,
      levelProfile: levelCount,
      volumeLedgerRule: volumeCount,
      sessionTemplate: templateCount,
      generatorRule: ruleCount,
      enumLookup: enumCount,
      openWorkout: openWorkoutCount,
      openWorkoutMovement: movementCount,
      officialMedia: videoCount,
    },
    issues: {
      unresolvedExerciseRelations: relationIssues,
      unresolvedScalingMapRefs: scalingIssues,
      unresolvedOpenMovementExerciseIds: movementIssues,
      unresolvedOfficialVideoExerciseIds: videoIssues,
    },
  };

  writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2), "utf-8");

  console.log("\n[seed] 완료. 요약:");
  console.table(summary.counts);
  console.log(
    `[seed] 미해결 항목 — 회귀/진행 ${relationIssues.length}건, Scaling_Map ${scalingIssues.length}건, ` +
      `Open_Movement_Index ${movementIssues.length}건, Official_Videos ${videoIssues.length}건`
  );
  console.log(`[seed] 상세 리포트: ${REPORT_PATH}`);
}

main()
  .catch((err) => {
    console.error("[seed] 실패:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
