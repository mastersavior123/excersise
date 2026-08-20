import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { PROGRAM_EXPORT_INCLUDE, buildProgramExportCsv, buildProgramExportJson } from "@/lib/engine/exportProgram";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { id } = await params;
  const program = await prisma.program.findUnique({ where: { id }, include: PROGRAM_EXPORT_INCLUDE });
  if (!program || program.userId !== userId) {
    return NextResponse.json({ error: "찾을 수 없습니다" }, { status: 404 });
  }

  const format = req.nextUrl.searchParams.get("format") === "json" ? "json" : "csv";
  const filenameBase = `wod-compiler_program_${id.slice(0, 8)}`;

  if (format === "json") {
    const body = JSON.stringify(buildProgramExportJson(program), null, 2);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.json"`,
      },
    });
  }

  const csv = buildProgramExportCsv(program);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
    },
  });
}
