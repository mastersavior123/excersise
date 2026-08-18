import type { PrismaClient } from "@prisma/client";
import { splitSlash } from "../lib/parseUtils";
import type { SeedExerciseResult } from "./seedExercise";
import { getDataRows } from "../lib/xlsx";

const COL = { exerciseId: 0, regressionText: 14, progressionText: 15 } as const;

export interface RelationIssue {
  exerciseId: string;
  relationType: "regression" | "progression";
  unresolvedText: string;
}

/**
 * Exercise_DB의 회귀/진행 컬럼('/'로 구분된 한글명 목록)을 exercise_alias로 정규화해
 * exercise_relation 행을 만든다. 별칭 테이블에 없는 텍스트는 relation을 만들지 않고
 * issue로 수집해 db:validate 리포트에서 드러나게 한다.
 */
export async function seedExerciseRelations(
  prisma: PrismaClient,
  exerciseCtx: SeedExerciseResult
): Promise<RelationIssue[]> {
  const rows = await getDataRows("Exercise_DB");
  const issues: RelationIssue[] = [];

  for (const row of rows) {
    const exerciseId = String(row[COL.exerciseId]);
    if (!exerciseCtx.exerciseIds.has(exerciseId)) continue;

    for (const [relationType, colIdx] of [
      ["regression", COL.regressionText],
      ["progression", COL.progressionText],
    ] as const) {
      const options = splitSlash(row[colIdx]);
      for (let orderIndex = 0; orderIndex < options.length; orderIndex++) {
        const text = options[orderIndex];
        const targetId = exerciseCtx.aliasMap.get(text);
        if (!targetId) {
          issues.push({ exerciseId, relationType, unresolvedText: text });
          continue;
        }
        await prisma.exerciseRelation.create({
          data: { exerciseId, relationType, orderIndex, targetExerciseId: targetId },
        });
      }
    }
  }

  return issues;
}
