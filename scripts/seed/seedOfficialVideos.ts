import type { PrismaClient } from "@prisma/client";
import { getDataRows } from "../lib/xlsx";
import { asRequiredString, asString } from "../lib/parseUtils";
import type { SeedExerciseResult } from "./seedExercise";

const COL = {
  videoId: 0,
  movement: 1,
  exerciseId: 2,
  officialTitle: 3,
  purpose: 4,
  youtubeUrl: 5,
  verifiedDate: 6,
  sourceId: 7,
} as const;

export interface OfficialVideoIssue {
  videoId: string;
  exerciseId: string;
}

export async function seedOfficialVideos(
  prisma: PrismaClient,
  exerciseCtx: SeedExerciseResult
): Promise<{ count: number; issues: OfficialVideoIssue[] }> {
  const rows = await getDataRows("Official_Videos");
  const issues: OfficialVideoIssue[] = [];

  for (const row of rows) {
    const videoId = asRequiredString(row[COL.videoId], "Official_Videos.VideoID");
    const exerciseIdRaw = asString(row[COL.exerciseId]);
    let exerciseId: string | null = exerciseIdRaw;
    if (exerciseIdRaw && !exerciseCtx.exerciseIds.has(exerciseIdRaw)) {
      issues.push({ videoId, exerciseId: exerciseIdRaw });
      exerciseId = null;
    }

    const verifiedDateStr = asString(row[COL.verifiedDate]);

    await prisma.officialMedia.create({
      data: {
        videoId,
        movement: asRequiredString(row[COL.movement], `${videoId}.Movement`),
        exerciseId,
        officialTitle: asString(row[COL.officialTitle]),
        purpose: asString(row[COL.purpose]),
        youtubeUrl: asRequiredString(row[COL.youtubeUrl], `${videoId}.YouTube URL`),
        verifiedDate: verifiedDateStr ? new Date(verifiedDateStr) : null,
        sourceId: asString(row[COL.sourceId]),
      },
    });
  }

  return { count: rows.length, issues };
}
