import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BENCHMARK_KIND_LABELS, compareBenchmark, formatParsed, type BenchmarkKind, type ParsedBenchmark } from "@/lib/benchmarkParse";

/**
 * 워크아웃별 리더보드. 로그인 필요(공개 기록이라도 이메일이 식별자라 익명 노출은 하지 않는다).
 * Rx / Scaled를 나눠 보여주고, 각 그룹 안에서 kind 우선순위(time > rounds+reps > reps > load) →
 * 성적 순으로 정렬한다. 해석 안 된 기록은 "미분류"로 맨 아래.
 */
export default async function LeaderboardPage({ params }: { params: Promise<{ year: string; workout: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { year: yearRaw, workout: workoutRaw } = await params;
  const year = Number(yearRaw);
  const workout = decodeURIComponent(workoutRaw);
  if (!Number.isInteger(year)) notFound();

  const open = await prisma.openWorkout.findUnique({ where: { year_workout: { year, workout } } });
  if (!open) notFound();

  const rows = await prisma.benchmarkResult.findMany({
    where: { year, workout, OR: [{ isPublic: true }, { userId: user.id }] },
    include: { user: { select: { id: true, email: true } } },
  });

  const toParsed = (r: (typeof rows)[number]): ParsedBenchmark => ({
    kind: (r.resultKind as BenchmarkKind | null) ?? null,
    seconds: r.resultSeconds ?? undefined,
    reps: r.resultReps ?? undefined,
    rounds: r.resultRounds ?? undefined,
    loadKg: r.resultLoadKg ? Number(r.resultLoadKg) : undefined,
  });

  const groups = (["Rx", "Scaled"] as const).map((label) => {
    const scaled = label === "Scaled";
    const list = rows
      .filter((r) => r.scaled === scaled)
      .map((r) => ({ r, p: toParsed(r) }))
      .sort((a, b) => compareBenchmark(a.p, b.p));
    return { label, list };
  });

  return (
    <>
      <div className="topbar">
        <Link href="/dashboard" className="brand">
          WOD Compiler
        </Link>
        <Link href="/benchmarks">
          <button className="secondary">벤치마크 목록으로</button>
        </Link>
      </div>
      <div className="container wide">
        <h1>
          {year} {workout} 리더보드
        </h1>
        <p className="lede">
          {open.format ?? "-"} · 타임캡 {open.timeCap ?? "-"} · {open.canonicalMovements.join(", ")}
          {open.officialUrl && (
            <>
              {" · "}
              <a href={open.officialUrl} target="_blank" rel="noreferrer">
                공식 페이지 ↗
              </a>
            </>
          )}
        </p>
        <p className="hint" style={{ marginTop: "-1rem", marginBottom: "1.2rem" }}>
          "공개"로 저장한 기록만 보인다(내 기록은 비공개여도 보임). For time에서 캡 안에 끝낸 기록(시간)은
          못 끝낸 기록(반복 수)보다 항상 위에 온다.
        </p>

        {groups.map(({ label, list }) => (
          <div className="card" key={label} style={{ marginBottom: "1.5rem" }}>
            <h2>
              {label} ({list.length})
            </h2>
            {list.length === 0 ? (
              <p className="lede" style={{ marginBottom: 0 }}>
                아직 공개된 기록이 없습니다.
              </p>
            ) : (
              <table className="mini" style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>사용자</th>
                    <th>결과</th>
                    <th>해석</th>
                    <th>기록일</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ r, p }, i) => (
                    <tr key={r.id} style={r.userId === user.id ? { fontWeight: 600 } : undefined}>
                      <td>{p.kind ? i + 1 : "-"}</td>
                      <td>
                        {r.user.email}
                        {r.userId === user.id && !r.isPublic && (
                          <span className="pill" style={{ marginLeft: "0.4rem", fontSize: "0.65rem" }}>
                            비공개(나만 보임)
                          </span>
                        )}
                      </td>
                      <td>{r.resultText}</td>
                      <td>
                        {p.kind ? `${formatParsed(p)} · ${BENCHMARK_KIND_LABELS[p.kind]}` : "미분류"}
                      </td>
                      <td>{r.recordedAt.toISOString().slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
