import type { PrismaClient } from "@prisma/client";
import { getDataRows } from "../lib/xlsx";
import {
  asBoolYN,
  asInt,
  asRequiredInt,
  asRequiredString,
  asString,
  parseSetsReps,
  splitComma,
  splitCommaInts,
  splitPlus,
  splitSlash,
} from "../lib/parseUtils";

// Exercise_DB 컬럼 순서 (0-based). 헤더 행(row4)을 직접 읽어 만든 고정 인덱스 —
// xlsx 컬럼 순서가 바뀌면 이 상수도 함께 갱신해야 한다.
const COL = {
  exerciseId: 0,
  nameKo: 1,
  nameEn: 2,
  modality: 3,
  family: 4,
  primaryPattern: 5,
  recommendedSlots: 6,
  equipment: 7,
  minLevel: 8,
  skillComplexity: 9,
  impact: 10,
  doseUnit: 11,
  defaultDoseRaw: 12,
  relativeLoad: 13,
  regressionText: 14,
  progressionText: 15,
  contraindications: 16,
  sourceId: 17,
  sourceUrl: 18,
  openRx: 19,
  openWorkoutCount: 20,
  openSeasons: 21,
  openWorkouts: 22,
  mostRecentOpenYear: 23,
  crossfitMovementsUrl: 24,
  officialYoutubeUrl: 25,
} as const;

export interface SeedExerciseResult {
  /** 표시 이름(한글명/English) → ExerciseID. 다른 시트의 텍스트 참조를 정규화하는 데 사용 */
  aliasMap: Map<string, string>;
  exerciseIds: Set<string>;
  count: number;
}

export async function seedExercises(prisma: PrismaClient): Promise<SeedExerciseResult> {
  const rows = await getDataRows("Exercise_DB");
  const aliasMap = new Map<string, string>();
  const exerciseIds = new Set<string>();

  for (const row of rows) {
    const exerciseId = asRequiredString(row[COL.exerciseId], "Exercise_DB.ExerciseID");
    const nameKo = asRequiredString(row[COL.nameKo], `${exerciseId}.한글명`);
    const nameEn = asRequiredString(row[COL.nameEn], `${exerciseId}.English`);
    const doseUnit = asRequiredString(row[COL.doseUnit], `${exerciseId}.처방단위`);
    const defaultDoseRaw = asRequiredString(row[COL.defaultDoseRaw], `${exerciseId}.기본용량`);
    const parsedDose = doseUnit === "세트×회" ? parseSetsReps(defaultDoseRaw) : parseSetsReps(null);

    await prisma.exercise.create({
      data: {
        exerciseId,
        nameKo,
        nameEn,
        modality: asRequiredString(row[COL.modality], `${exerciseId}.모달리티`),
        family: asRequiredString(row[COL.family], `${exerciseId}.계열`),
        primaryPattern: splitPlus(row[COL.primaryPattern]),
        recommendedSlots: splitSlash(row[COL.recommendedSlots]),
        equipment: splitSlash(row[COL.equipment]),
        minLevel: asRequiredInt(row[COL.minLevel], `${exerciseId}.MinLevel`),
        skillComplexity: asRequiredInt(row[COL.skillComplexity], `${exerciseId}.Skill`),
        impact: asRequiredString(row[COL.impact], `${exerciseId}.충격`),
        doseUnit,
        defaultDoseRaw,
        defaultDoseSetsMin: parsedDose.setsMin,
        defaultDoseSetsMax: parsedDose.setsMax,
        defaultDoseRepsMin: parsedDose.repsMin,
        defaultDoseRepsMax: parsedDose.repsMax,
        relativeLoad: asRequiredString(row[COL.relativeLoad], `${exerciseId}.상대부하`),
        regressionText: asString(row[COL.regressionText]),
        progressionText: asString(row[COL.progressionText]),
        contraindications: asString(row[COL.contraindications]),
        sourceId: asRequiredString(row[COL.sourceId], `${exerciseId}.SourceID`),
        sourceUrl: asString(row[COL.sourceUrl]),
        openRx2017to26: asBoolYN(row[COL.openRx]),
        openWorkoutCount: asInt(row[COL.openWorkoutCount]) ?? 0,
        openSeasons: splitCommaInts(row[COL.openSeasons]),
        openWorkouts: splitComma(row[COL.openWorkouts]),
        mostRecentOpenYear: asInt(row[COL.mostRecentOpenYear]),
        crossfitMovementsUrl: asString(row[COL.crossfitMovementsUrl]),
        officialYoutubeUrl: asString(row[COL.officialYoutubeUrl]),
      },
    });

    exerciseIds.add(exerciseId);
    aliasMap.set(nameKo, exerciseId);
    aliasMap.set(nameEn, exerciseId);
  }

  // 별칭(한글명/English) 테이블 적재. 두 표시 이름이 우연히 같은 값을 가리키면 마지막 쓰기가 이긴다 —
  // 115개 데이터셋에서는 발생하지 않음을 확인했으나 향후 확장 시 db:validate로 중복을 감지한다.
  for (const [aliasName, exerciseId] of aliasMap.entries()) {
    await prisma.exerciseAlias.upsert({
      where: { aliasName },
      update: { exerciseId },
      create: { aliasName, exerciseId },
    });
  }

  return { aliasMap, exerciseIds, count: rows.length };
}
