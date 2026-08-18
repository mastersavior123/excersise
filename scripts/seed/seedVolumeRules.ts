import type { PrismaClient } from "@prisma/client";
import { getDataRows } from "../lib/xlsx";
import { asRequiredInt, asRequiredString, asString } from "../lib/parseUtils";

const COL = {
  ledgerId: 0,
  ledgerName: 1,
  level: 2,
  minValue: 3,
  maxValue: 4,
  unit: 5,
  aggregationRule: 6,
  usageNote: 7,
  evidenceStatus: 8,
} as const;

export async function seedVolumeRules(prisma: PrismaClient): Promise<number> {
  const rows = await getDataRows("Volume_Rules");
  for (const row of rows) {
    const ledgerId = asRequiredString(row[COL.ledgerId], "Volume_Rules.LedgerID");
    const level = asRequiredInt(row[COL.level], `${ledgerId}.Level`);
    await prisma.volumeLedgerRule.create({
      data: {
        ledgerId,
        ledgerName: asRequiredString(row[COL.ledgerName], `${ledgerId}.장부`),
        level,
        minValue: asRequiredInt(row[COL.minValue], `${ledgerId}L${level}.최소`),
        maxValue: asRequiredInt(row[COL.maxValue], `${ledgerId}L${level}.최대`),
        unit: asRequiredString(row[COL.unit], `${ledgerId}L${level}.단위`),
        aggregationRule: asRequiredString(row[COL.aggregationRule], `${ledgerId}L${level}.집계규칙`),
        usageNote: asString(row[COL.usageNote]),
        evidenceStatus: asString(row[COL.evidenceStatus]),
      },
    });
  }
  return rows.length;
}
