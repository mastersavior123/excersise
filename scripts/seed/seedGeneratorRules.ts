import type { PrismaClient } from "@prisma/client";
import { getDataRows } from "../lib/xlsx";
import { asRequiredInt, asRequiredString, asString } from "../lib/parseUtils";

const COL = {
  orderIndex: 0,
  stage: 1,
  checkItem: 2,
  conditionRule: 3,
  action: 4,
  evidence: 5,
} as const;

export async function seedGeneratorRules(prisma: PrismaClient): Promise<number> {
  const rows = await getDataRows("Generator_Rules");
  for (const row of rows) {
    const orderIndex = asRequiredInt(row[COL.orderIndex], "Generator_Rules.순서");
    await prisma.generatorRule.create({
      data: {
        orderIndex,
        stage: asRequiredString(row[COL.stage], `rule${orderIndex}.단계`),
        checkItem: asRequiredString(row[COL.checkItem], `rule${orderIndex}.검사항목`),
        conditionRule: asRequiredString(row[COL.conditionRule], `rule${orderIndex}.조건규칙`),
        action: asRequiredString(row[COL.action], `rule${orderIndex}.Action`),
        evidence: asString(row[COL.evidence]),
      },
    });
  }
  return rows.length;
}
