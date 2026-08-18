import type { PrismaClient } from "@prisma/client";
import { getDataRows } from "../lib/xlsx";
import { asRequiredString, asString } from "../lib/parseUtils";

const COL = {
  templateId: 0,
  frequency: 1,
  dayLabel: 2,
  dayType: 3,
  slotSequenceRaw: 4,
  conditioning: 5,
  recommendedWeekday: 6,
  conflictNote: 7,
} as const;

export type SlotCode =
  | "warmup"
  | "skill_power"
  | "main_strength"
  | "accessory"
  | "metcon"
  | "conditioning"
  | "cooldown";

/**
 * Session_Templates.슬롯 순서는 자유 텍스트라 자동 분류가 불확실하다(예: '짧은 기술형 인터벌'은
 * 기술 연습이 아니라 메트콘에 가깝다). 9개 템플릿에 실제로 등장하는 세그먼트를 모두 수작업으로
 * 매핑해 정확도를 확보한다. 시트가 갱신되어 새 세그먼트가 생기면 UNMAPPED_SEGMENT로 표시되고
 * db:validate가 이를 리포트한다 — 그때마다 이 표에 항목을 추가해야 한다.
 */
const SEGMENT_TO_SLOT: Record<string, SlotCode> = {
  "역도 기술/파워": "skill_power",
  "하체 스쿼트": "main_strength",
  "짧은 커플릿": "metcon",
  "체조 기술": "skill_power",
  "상체 보조": "accessory",
  "Zone 2/쉬운 인터벌": "conditioning",
  "클린/저크": "skill_power",
  "힌지/풀": "main_strength",
  "중간 트리플릿": "metcon",
  "전신 근력 또는 5×5 변형": "main_strength",
  "긴 기술형 메트콘": "metcon",
  "스내치": "skill_power",
  "스쿼트": "main_strength",
  "짧은 메트콘": "metcon",
  "저크/오버헤드 기술": "skill_power",
  "저강도": "conditioning",
  "클린": "skill_power",
  "풀/힌지": "main_strength",
  "중간 메트콘": "metcon",
  "파워 변형": "skill_power",
  "보조/프리햅": "accessory",
  "짧은 기술형 인터벌": "metcon",
  "중량 조합/테스트(레벨별)": "main_strength",
  "경기형 혼합": "metcon",
};

export const UNMAPPED_SEGMENT = "UNMAPPED_SEGMENT";

function parseSlotSequence(raw: string): string[] {
  return raw
    .split("→")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => SEGMENT_TO_SLOT[segment] ?? UNMAPPED_SEGMENT);
}

export async function seedSessionTemplates(prisma: PrismaClient): Promise<number> {
  const rows = await getDataRows("Session_Templates");
  for (const row of rows) {
    const templateId = asRequiredString(row[COL.templateId], "Session_Templates.TemplateID");
    const slotSequenceRaw = asRequiredString(row[COL.slotSequenceRaw], `${templateId}.슬롯순서`);
    await prisma.sessionTemplate.create({
      data: {
        templateId,
        frequency: asRequiredString(row[COL.frequency], `${templateId}.빈도`),
        dayLabel: asRequiredString(row[COL.dayLabel], `${templateId}.세션`),
        dayType: asRequiredString(row[COL.dayType], `${templateId}.DayType`),
        slotSequenceRaw,
        slotSequenceParsed: parseSlotSequence(slotSequenceRaw),
        conditioning: asString(row[COL.conditioning]),
        recommendedWeekday: asString(row[COL.recommendedWeekday]),
        conflictNote: asString(row[COL.conflictNote]),
      },
    });
  }
  return rows.length;
}
