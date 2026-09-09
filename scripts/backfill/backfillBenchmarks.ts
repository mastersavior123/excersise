import { prisma } from "../lib/prisma";
import { parseBenchmarkResult } from "../../lib/benchmarkParse";

/**
 * Phase 7 이전에 저장된 benchmark_result(result_kind가 null인 행)의 원문을 다시 파싱해 구조화 컬럼을
 * 채운다. 원문·공개 여부·scaled는 건드리지 않는다(공개는 기본 false로 남긴다 — 예전 기록을 사용자
 * 동의 없이 리더보드에 올리지 않는다). 몇 번 돌려도 결과가 같은 멱등 스크립트.
 */
async function main() {
  const rows = await prisma.benchmarkResult.findMany({ where: { resultKind: null } });
  let parsed = 0;
  for (const r of rows) {
    const p = parseBenchmarkResult(r.resultText);
    if (!p.kind) continue;
    await prisma.benchmarkResult.update({
      where: { id: r.id },
      data: {
        resultKind: p.kind,
        resultSeconds: p.seconds ?? null,
        resultReps: p.reps ?? null,
        resultRounds: p.rounds ?? null,
        resultLoadKg: p.loadKg ?? null,
      },
    });
    parsed++;
  }
  console.log(`대상 ${rows.length}건 중 ${parsed}건 해석, ${rows.length - parsed}건은 미분류로 남김`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
