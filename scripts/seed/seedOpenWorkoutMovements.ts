import type { PrismaClient } from "@prisma/client";
import { getDataRows } from "../lib/xlsx";
import { asInt, asRequiredString, asString, splitCommaInts } from "../lib/parseUtils";
import type { SeedExerciseResult } from "./seedExercise";

const COL = {
  canonicalMovement: 0,
  exerciseId: 1,
  workoutCount: 2,
  seasonCount: 3,
  seasonsAppeared: 4,
  workoutsAppeared: 5,
  mostRecentYear: 6,
  normalizationNote: 7,
  officialYoutubeUrl: 8,
  crossfitMovementsUrl: 9,
} as const;

export interface OpenMovementIssue {
  canonicalMovement: string;
  exerciseId: string;
}

export async function seedOpenWorkoutMovements(
  prisma: PrismaClient,
  exerciseCtx: SeedExerciseResult
): Promise<{ count: number; issues: OpenMovementIssue[] }> {
  const rows = await getDataRows("Open_Movement_Index");
  const issues: OpenMovementIssue[] = [];
  let count = 0;

  for (const row of rows) {
    const canonicalMovement = asRequiredString(row[COL.canonicalMovement], "Open_Movement_Index.Canonical movement");
    const exerciseId = asRequiredString(row[COL.exerciseId], `${canonicalMovement}.ExerciseID`);

    if (!exerciseCtx.exerciseIds.has(exerciseId)) {
      issues.push({ canonicalMovement, exerciseId });
      continue;
    }

    await prisma.openWorkoutMovement.create({
      data: {
        canonicalMovement,
        exerciseId,
        workoutCount: asInt(row[COL.workoutCount]),
        seasonCount: asInt(row[COL.seasonCount]),
        seasonsAppeared: splitCommaInts(row[COL.seasonsAppeared]),
        workoutsAppearedRaw: asString(row[COL.workoutsAppeared]),
        mostRecentYear: asInt(row[COL.mostRecentYear]),
        normalizationNote: asString(row[COL.normalizationNote]),
        officialYoutubeUrl: asString(row[COL.officialYoutubeUrl]),
        crossfitMovementsUrl: asString(row[COL.crossfitMovementsUrl]),
      },
    });
    count++;
  }

  return { count, issues };
}
