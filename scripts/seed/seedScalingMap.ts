import type { PrismaClient } from "@prisma/client";
import { getDataRows } from "../lib/xlsx";
import { asRequiredString, asString } from "../lib/parseUtils";
import type { SeedExerciseResult } from "./seedExercise";

const COL = {
  scaleId: 0,
  original: 1,
  regression1: 2,
  regression2: 3,
  preservedFunction: 4,
  stimulusTime: 5,
  coachingNote: 6,
} as const;

export interface ScalingMapIssue {
  scaleId: string;
  field: "original" | "regression1" | "regression2";
  text: string;
}

/**
 * Scaling_Map은 영문 동작명 자유 텍스트다(예: 'Band-assisted pull-up'). Exercise_DB의
 * English 별칭과 정확히 일치하는 경우만 exercise_id로 연결하고, 나머지는 원문(*_text)만
 * 저장한다. 코치 검수 전에는 이 매핑을 처방 로직의 신뢰 가능한 근거로 쓰지 않는다.
 */
export async function seedScalingMap(
  prisma: PrismaClient,
  exerciseCtx: SeedExerciseResult
): Promise<ScalingMapIssue[]> {
  const rows = await getDataRows("Scaling_Map");
  const issues: ScalingMapIssue[] = [];

  for (const row of rows) {
    const scaleId = asRequiredString(row[COL.scaleId], "Scaling_Map.ScaleID");
    const originalText = asRequiredString(row[COL.original], `${scaleId}.원본`);
    const regression1Text = asRequiredString(row[COL.regression1], `${scaleId}.1차회귀`);
    const regression2Text = asRequiredString(row[COL.regression2], `${scaleId}.2차회귀`);

    const originalId = exerciseCtx.aliasMap.get(originalText) ?? null;
    const regression1Id = exerciseCtx.aliasMap.get(regression1Text) ?? null;
    const regression2Id = exerciseCtx.aliasMap.get(regression2Text) ?? null;

    if (!originalId) issues.push({ scaleId, field: "original", text: originalText });
    if (!regression1Id) issues.push({ scaleId, field: "regression1", text: regression1Text });
    if (!regression2Id) issues.push({ scaleId, field: "regression2", text: regression2Text });

    await prisma.scalingMap.create({
      data: {
        scaleId,
        originalText,
        originalExerciseId: originalId,
        regression1Text,
        regression1ExerciseId: regression1Id,
        regression2Text,
        regression2ExerciseId: regression2Id,
        preservedFunction: asRequiredString(row[COL.preservedFunction], `${scaleId}.보존기능`),
        stimulusTime: asRequiredString(row[COL.stimulusTime], `${scaleId}.자극시간`),
        coachingNote: asString(row[COL.coachingNote]),
      },
    });
  }

  return issues;
}
