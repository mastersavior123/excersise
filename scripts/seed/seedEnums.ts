import type { PrismaClient } from "@prisma/client";
import { getDataRows } from "../lib/xlsx";
import { asRequiredString, asString } from "../lib/parseUtils";

const COL = { enumType: 0, code: 1, labelKo: 2, description: 3 } as const;

export async function seedEnums(prisma: PrismaClient): Promise<number> {
  const rows = await getDataRows("Enums");
  for (const row of rows) {
    const enumType = asRequiredString(row[COL.enumType], "Enums.Enum");
    const code = asRequiredString(row[COL.code], `${enumType}.Code`);
    await prisma.enumLookup.create({
      data: {
        enumType,
        code,
        labelKo: asRequiredString(row[COL.labelKo], `${enumType}.${code}.한글`),
        description: asString(row[COL.description]),
      },
    });
  }
  return rows.length;
}
