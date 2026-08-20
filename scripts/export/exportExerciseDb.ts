import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../lib/prisma";

/**
 * README 11장 검증 과제 1("CrossFit L2+ 코치와 역도 코치가 115개 운동의 MinLevel, 금기,
 * 회귀·진행 사슬을 검수한다")을 위한 오프라인 검수용 자료를 만든다. Phase 0에서 발견한 대로
 * regression_text/progression_text 원문 중 exercise_relation으로 실제 해석된 것은 13%뿐이라,
 * 코치가 "원문 그대로"와 "시스템이 자동으로 연결한 것"을 나란히 보고 판단할 수 있게 둘 다 넣는다.
 */

const OUT_DIR = join(import.meta.dirname, "..", "..", "data", "exports");

function csvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(values: (string | number | boolean | null | undefined)[]): string {
  return values.map(csvField).join(",");
}

async function main() {
  const exercises = await prisma.exercise.findMany({
    orderBy: { exerciseId: "asc" },
    include: {
      relationsFrom: {
        include: { targetExercise: { select: { nameKo: true } } },
      },
    },
  });

  const header = [
    "ExerciseID",
    "한글명",
    "English",
    "모달리티",
    "계열",
    "MinLevel",
    "SkillComplexity",
    "충격",
    "처방단위",
    "기본용량_원문",
    "상대부하",
    "금기_주의",
    "회귀_원문",
    "회귀_해석됨",
    "진행_원문",
    "진행_해석됨",
    "SourceID",
    "SourceURL",
    "CrossFitMovementsURL",
    "공식YouTube",
  ];

  const rows: string[][] = [];
  const jsonRows: object[] = [];

  let regressionResolvedCount = 0;
  let regressionTextCount = 0;
  let progressionResolvedCount = 0;
  let progressionTextCount = 0;

  for (const ex of exercises) {
    const regressions = ex.relationsFrom.filter((r) => r.relationType === "regression");
    const progressions = ex.relationsFrom.filter((r) => r.relationType === "progression");
    const regressionResolved = regressions.map((r) => r.targetExercise.nameKo).join(" / ");
    const progressionResolved = progressions.map((r) => r.targetExercise.nameKo).join(" / ");

    if (ex.regressionText) {
      regressionTextCount++;
      if (regressions.length > 0) regressionResolvedCount++;
    }
    if (ex.progressionText) {
      progressionTextCount++;
      if (progressions.length > 0) progressionResolvedCount++;
    }

    rows.push([
      ex.exerciseId,
      ex.nameKo,
      ex.nameEn,
      ex.modality,
      ex.family,
      String(ex.minLevel),
      String(ex.skillComplexity),
      ex.impact,
      ex.doseUnit,
      ex.defaultDoseRaw,
      ex.relativeLoad,
      ex.contraindications ?? "",
      ex.regressionText ?? "",
      regressionResolved || (ex.regressionText ? "미해석" : ""),
      ex.progressionText ?? "",
      progressionResolved || (ex.progressionText ? "미해석" : ""),
      ex.sourceId,
      ex.sourceUrl ?? "",
      ex.crossfitMovementsUrl ?? "",
      ex.officialYoutubeUrl ?? "",
    ]);

    jsonRows.push({
      exerciseId: ex.exerciseId,
      nameKo: ex.nameKo,
      nameEn: ex.nameEn,
      modality: ex.modality,
      family: ex.family,
      minLevel: ex.minLevel,
      skillComplexity: ex.skillComplexity,
      impact: ex.impact,
      doseUnit: ex.doseUnit,
      defaultDoseRaw: ex.defaultDoseRaw,
      relativeLoad: ex.relativeLoad,
      contraindications: ex.contraindications,
      regression: { text: ex.regressionText, resolved: regressions.map((r) => r.targetExercise.nameKo) },
      progression: { text: ex.progressionText, resolved: progressions.map((r) => r.targetExercise.nameKo) },
      sourceId: ex.sourceId,
      sourceUrl: ex.sourceUrl,
      crossfitMovementsUrl: ex.crossfitMovementsUrl,
      officialYoutubeUrl: ex.officialYoutubeUrl,
    });
  }

  const bom = "﻿";
  const csv = bom + [csvRow(header), ...rows.map(csvRow)].join("\r\n") + "\r\n";
  const csvPath = join(OUT_DIR, "exercise_db_review.csv");
  writeFileSync(csvPath, csv, "utf-8");

  const jsonPath = join(OUT_DIR, "exercise_db_review.json");
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        count: exercises.length,
        regressionResolutionRate: regressionTextCount ? regressionResolvedCount / regressionTextCount : null,
        progressionResolutionRate: progressionTextCount ? progressionResolvedCount / progressionTextCount : null,
        exercises: jsonRows,
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log(`[export] ${exercises.length}개 운동 -> ${csvPath}, ${jsonPath}`);
  console.log(
    `[export] 회귀 텍스트 ${regressionTextCount}건 중 ${regressionResolvedCount}건 해석됨 ` +
      `(${regressionTextCount ? Math.round((regressionResolvedCount / regressionTextCount) * 100) : 0}%)`
  );
  console.log(
    `[export] 진행 텍스트 ${progressionTextCount}건 중 ${progressionResolvedCount}건 해석됨 ` +
      `(${progressionTextCount ? Math.round((progressionResolvedCount / progressionTextCount) * 100) : 0}%)`
  );
}

main()
  .catch((err) => {
    console.error("[export] 실패:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
