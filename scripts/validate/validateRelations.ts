import { prisma } from "../lib/prisma";
import { UNMAPPED_SEGMENT } from "../seed/seedSessionTemplates";

/**
 * db:seed가 남긴 data/seed-report.json은 "적재 시점에 즉시 알 수 있는" 미해결 항목을 기록한다.
 * 이 스크립트는 시딩이 끝난 실제 DB 상태를 다시 쿼리해서, 여러 테이블을 조인해야 드러나는
 * 문제까지 함께 검증한다. 종료 코드가 0이 아니면 CI에서 실패로 처리할 수 있다.
 */

interface ValidationIssue {
  category: string;
  detail: string;
}

async function checkUnmappedSlotSegments(): Promise<ValidationIssue[]> {
  const templates = await prisma.sessionTemplate.findMany();
  return templates
    .filter((t) => t.slotSequenceParsed.includes(UNMAPPED_SEGMENT))
    .map((t) => ({
      category: "session_template.slot_sequence_parsed 미분류",
      detail: `${t.templateId}: "${t.slotSequenceRaw}"`,
    }));
}

async function checkOrphanExercises(): Promise<ValidationIssue[]> {
  // 회귀/진행 텍스트는 있는데 exercise_relation 행이 하나도 없는 운동 = alias 해석 실패
  const exercises = await prisma.exercise.findMany({
    where: { OR: [{ regressionText: { not: null } }, { progressionText: { not: null } }] },
    include: { relationsFrom: true },
  });
  return exercises
    .filter((ex) => (ex.regressionText || ex.progressionText) && ex.relationsFrom.length === 0)
    .map((ex) => ({
      category: "exercise 회귀/진행 alias 미해결",
      detail: `${ex.exerciseId} (${ex.nameKo}): regression="${ex.regressionText}" progression="${ex.progressionText}"`,
    }));
}

async function checkLedgerRangeSanity(): Promise<ValidationIssue[]> {
  const rules = await prisma.volumeLedgerRule.findMany();
  return rules
    .filter((r) => Number(r.minValue) > Number(r.maxValue))
    .map((r) => ({
      category: "volume_ledger_rule min>max",
      detail: `${r.ledgerId} Level${r.level}: min=${r.minValue} max=${r.maxValue}`,
    }));
}

async function checkGeneratorRuleOrderContinuity(): Promise<ValidationIssue[]> {
  const rules = await prisma.generatorRule.findMany({ orderBy: { orderIndex: "asc" } });
  const issues: ValidationIssue[] = [];
  rules.forEach((rule, i) => {
    const expected = i + 1;
    if (rule.orderIndex !== expected) {
      issues.push({
        category: "generator_rule 순서 불연속",
        detail: `index ${i}에서 order_index=${rule.orderIndex} (기대값 ${expected})`,
      });
    }
  });
  return issues;
}

async function checkExerciseRelationTargetsExist(): Promise<ValidationIssue[]> {
  // FK 제약으로 대상 존재는 이미 보장되지만, 자기 자신을 참조하는 회귀/진행처럼
  // 논리적으로만 이상한 케이스는 FK로 걸러지지 않으므로 별도 확인한다.
  const all = await prisma.exerciseRelation.findMany();
  const selfLoop = all.filter((r) => r.exerciseId === r.targetExerciseId);
  return selfLoop.map((r) => ({
    category: "exercise_relation 자기참조",
    detail: `${r.exerciseId} -> ${r.relationType} -> ${r.targetExerciseId}`,
  }));
}

async function main() {
  const [unmappedSlots, orphanExercises, ledgerSanity, ruleOrder, selfLoops] = await Promise.all([
    checkUnmappedSlotSegments(),
    checkOrphanExercises(),
    checkLedgerRangeSanity(),
    checkGeneratorRuleOrderContinuity(),
    checkExerciseRelationTargetsExist(),
  ]);

  const allIssues = [...unmappedSlots, ...orphanExercises, ...ledgerSanity, ...ruleOrder, ...selfLoops];

  const counts = await prisma.$transaction([
    prisma.exercise.count(),
    prisma.exerciseAlias.count(),
    prisma.exerciseRelation.count(),
    prisma.levelProfile.count(),
    prisma.volumeLedgerRule.count(),
    prisma.sessionTemplate.count(),
    prisma.generatorRule.count(),
    prisma.scalingMap.count(),
    prisma.enumLookup.count(),
    prisma.openWorkout.count(),
    prisma.openWorkoutMovement.count(),
    prisma.officialMedia.count(),
  ]);

  console.log("[validate] 테이블 행 수:");
  console.table({
    exercise: counts[0],
    exerciseAlias: counts[1],
    exerciseRelation: counts[2],
    levelProfile: counts[3],
    volumeLedgerRule: counts[4],
    sessionTemplate: counts[5],
    generatorRule: counts[6],
    scalingMap: counts[7],
    enumLookup: counts[8],
    openWorkout: counts[9],
    openWorkoutMovement: counts[10],
    officialMedia: counts[11],
  });

  if (allIssues.length === 0) {
    console.log("[validate] 통과 — DB 레벨 이상치 없음. (seed-report.json의 alias 미해결 건은 별도 검토 필요)");
    return;
  }

  console.log(`\n[validate] 이상치 ${allIssues.length}건:`);
  for (const issue of allIssues) {
    console.log(`  - [${issue.category}] ${issue.detail}`);
  }
  process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error("[validate] 실패:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
