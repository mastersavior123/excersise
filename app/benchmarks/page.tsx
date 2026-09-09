import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatParsed, type BenchmarkKind } from "@/lib/benchmarkParse";
import BenchmarkForm from "@/components/BenchmarkForm";

export default async function BenchmarksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [workouts, results, publicCounts] = await Promise.all([
    prisma.openWorkout.findMany({ orderBy: [{ year: "desc" }, { workout: "asc" }] }),
    prisma.benchmarkResult.findMany({ where: { userId: user.id } }),
    prisma.benchmarkResult.groupBy({ by: ["year", "workout"], where: { isPublic: true }, _count: { _all: true } }),
  ]);

  const resultByKey = new Map(results.map((r) => [`${r.year}_${r.workout}`, r]));
  const publicCountByKey = new Map(publicCounts.map((c) => [`${c.year}_${c.workout}`, c._count._all]));
  const years = Array.from(new Set(workouts.map((w) => w.year))).sort((a, b) => b - a);

  return (
    <>
      <div className="topbar">
        <Link href="/dashboard" className="brand">
          WOD Compiler
        </Link>
        <Link href="/dashboard">
          <button className="secondary">대시보드로</button>
        </Link>
      </div>
      <div className="container wide">
        <h1>오픈 워크아웃 벤치마크</h1>
        <p className="lede">
          2017~2026 CrossFit Open {workouts.length}개 워크아웃. 결과는 자유롭게 적되(12:34 · 185회 · 5+10 ·
          95kg) 시스템이 숫자로 해석해 리더보드에 정렬한다. "공개"에 체크한 기록만 리더보드와 팔로워
          피드에 나온다 — 기본은 비공개.
        </p>

        {years.map((year) => (
          <div className="card" key={year} style={{ marginBottom: "1.5rem" }}>
            <h2>{year} 시즌</h2>
            <table className="mini">
              <thead>
                <tr>
                  <th>워크아웃</th>
                  <th>포맷</th>
                  <th>타임캡</th>
                  <th>대표 동작</th>
                  <th>내 기록</th>
                  <th>리더보드</th>
                </tr>
              </thead>
              <tbody>
                {workouts
                  .filter((w) => w.year === year)
                  .map((w) => {
                    const key = `${w.year}_${w.workout}`;
                    const existing = resultByKey.get(key);
                    const n = publicCountByKey.get(key) ?? 0;
                    return (
                      <tr key={key}>
                        <td>
                          {w.officialUrl ? (
                            <a href={w.officialUrl} target="_blank" rel="noreferrer">
                              {w.workout} ↗
                            </a>
                          ) : (
                            w.workout
                          )}
                        </td>
                        <td>{w.format ?? "-"}</td>
                        <td>{w.timeCap ?? "-"}</td>
                        <td style={{ whiteSpace: "normal", maxWidth: "260px" }}>
                          {w.canonicalMovements.join(", ")}
                        </td>
                        <td style={{ whiteSpace: "normal" }}>
                          <BenchmarkForm
                            year={w.year}
                            workout={w.workout}
                            initial={
                              existing
                                ? {
                                    resultText: existing.resultText,
                                    notes: existing.notes,
                                    isPublic: existing.isPublic,
                                    scaled: existing.scaled,
                                    parsedLabel: existing.resultKind
                                      ? formatParsed({
                                          kind: existing.resultKind as BenchmarkKind,
                                          seconds: existing.resultSeconds ?? undefined,
                                          reps: existing.resultReps ?? undefined,
                                          rounds: existing.resultRounds ?? undefined,
                                          loadKg: existing.resultLoadKg ? Number(existing.resultLoadKg) : undefined,
                                        })
                                      : null,
                                  }
                                : null
                            }
                          />
                        </td>
                        <td>
                          <Link href={`/benchmarks/${w.year}/${encodeURIComponent(w.workout)}`}>보기 ({n})</Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
}
