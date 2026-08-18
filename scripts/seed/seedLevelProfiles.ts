import type { PrismaClient } from "@prisma/client";
import { getDataRows } from "../lib/xlsx";
import { asRequiredInt, asRequiredString, asString } from "../lib/parseUtils";

// Level_Profiles는 A~K(0~10)에 메인 테이블, M~O에 계산된 요약(사용 가능 운동 수)이
// 같은 행 범위에 겹쳐 있다. 요약 컬럼은 무시하고 메인 테이블만 읽는다.
const COL = {
  level: 0,
  groupName: 1,
  weeklyFrequency: 2,
  criteriaText: 3,
  sessionMinutesRange: 4,
  weeklyStructure: 5,
  highIntensityCap: 6,
  consecutiveDayCap: 7,
  weeklyGoal: 8,
  cautions: 9,
  defaultDeload: 10,
} as const;

export async function seedLevelProfiles(prisma: PrismaClient): Promise<number> {
  const rows = await getDataRows("Level_Profiles");
  for (const row of rows) {
    const level = asRequiredInt(row[COL.level], "Level_Profiles.Level");
    await prisma.levelProfile.create({
      data: {
        level,
        groupName: asRequiredString(row[COL.groupName], `Level${level}.그룹`),
        weeklyFrequency: asRequiredString(row[COL.weeklyFrequency], `Level${level}.주간빈도`),
        criteriaText: asRequiredString(row[COL.criteriaText], `Level${level}.판정기준`),
        sessionMinutesRange: asRequiredString(row[COL.sessionMinutesRange], `Level${level}.세션분`),
        weeklyStructure: asRequiredString(row[COL.weeklyStructure], `Level${level}.주간구조`),
        highIntensityCap: asRequiredString(row[COL.highIntensityCap], `Level${level}.고강도일상한`),
        consecutiveDayCap: asRequiredString(row[COL.consecutiveDayCap], `Level${level}.연속일상한`),
        weeklyGoal: asRequiredString(row[COL.weeklyGoal], `Level${level}.주목표`),
        cautions: asString(row[COL.cautions]),
        defaultDeload: asRequiredString(row[COL.defaultDeload], `Level${level}.기본디로드`),
      },
    });
  }
  return rows.length;
}
