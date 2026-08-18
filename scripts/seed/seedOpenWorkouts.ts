import type { PrismaClient } from "@prisma/client";
import { getDataRows } from "../lib/xlsx";
import { asRequiredInt, asRequiredString, asString, splitPipe } from "../lib/parseUtils";

const COL = {
  year: 0,
  workout: 1,
  format: 2,
  timeCap: 3,
  canonicalMovements: 4,
  structureNote: 5,
  division: 6,
  sourceId: 7,
  officialUrl: 8,
} as const;

export async function seedOpenWorkouts(prisma: PrismaClient): Promise<number> {
  const rows = await getDataRows("Open_Workouts");
  for (const row of rows) {
    const year = asRequiredInt(row[COL.year], "Open_Workouts.Year");
    const workout = asRequiredString(row[COL.workout], `${year}.Workout`);
    await prisma.openWorkout.create({
      data: {
        year,
        workout,
        format: asString(row[COL.format]),
        timeCap: asString(row[COL.timeCap]),
        canonicalMovements: splitPipe(row[COL.canonicalMovements]),
        structureNote: asString(row[COL.structureNote]),
        division: asString(row[COL.division]),
        sourceId: asString(row[COL.sourceId]),
        officialUrl: asString(row[COL.officialUrl]),
      },
    });
  }
  return rows.length;
}
