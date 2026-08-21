import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import BenchmarkForm from "@/components/BenchmarkForm";

export default async function BenchmarksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [workouts, results] = await Promise.all([
    prisma.openWorkout.findMany({ orderBy: [{ year: "desc" }, { workout: "asc" }] }),
    prisma.benchmarkResult.findMany({ where: { userId: user.id } }),
  ]);

  const resultByKey = new Map(results.map((r) => [`${r.year}_${r.workout}`, r]));
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
          2017~2026 CrossFit Open {workouts.length}개 워크아웃. Phase 0에서 시딩만 해두고 쓰지 않던
          데이터를 여기서 처음 실제로 쓴다 — 자기 기록을 남기면 프로그램에 등장하는 운동과 대조해볼
          수 있다.
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
                </tr>
              </thead>
              <tbody>
                {workouts
                  .filter((w) => w.year === year)
                  .map((w) => {
                    const key = `${w.year}_${w.workout}`;
                    const existing = resultByKey.get(key);
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
                        <td style={{ whiteSpace: "normal", maxWidth: "280px" }}>
                          {w.canonicalMovements.join(", ")}
                        </td>
                        <td style={{ whiteSpace: "normal" }}>
                          <BenchmarkForm
                            year={w.year}
                            workout={w.workout}
                            initial={existing ? { resultText: existing.resultText, notes: existing.notes } : null}
                          />
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
