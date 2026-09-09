import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isCoach } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  listAssumptions,
  PARAMETER_REVIEW_STATUS_LABELS,
  type ParameterReviewStatus,
} from "@/lib/assumptions";
import ParameterReviewForm from "@/components/ParameterReviewForm";

export default async function AssumptionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isCoach(user)) redirect("/dashboard");

  const assumptions = listAssumptions();
  const reviews = await prisma.parameterReview.findMany({ include: { reviewedBy: { select: { email: true } } } });
  const reviewByKey = new Map(reviews.map((r) => [r.key, r]));
  const groups = [...new Set(assumptions.map((a) => a.group))];
  const approved = assumptions.filter((a) => reviewByKey.get(a.key)?.status === "approved").length;
  const needsChange = assumptions.filter((a) => reviewByKey.get(a.key)?.status === "needs_change").length;

  return (
    <>
      <div className="topbar">
        <Link href="/dashboard" className="brand">
          WOD Compiler
        </Link>
        <Link href="/coach">
          <button className="secondary">코치 대시보드로</button>
        </Link>
      </div>
      <div className="container wide">
        <h1>잠정 파라미터 검수</h1>
        <p className="lede">
          코드에 박혀 있는 "코치 검수 전 잠정값"을 한곳에 모았다. 값은 코드 상수에서 그대로 읽어 렌더하므로
          여기 보이는 숫자가 곧 지금 엔진이 쓰는 숫자다. 승인/수정 요청은 "누가 언제"와 함께 남는다 —
          값 자체를 여기서 고치게 하는 건 첫 검수가 끝난 뒤의 일이다.
        </p>
        <div className="summary-grid" style={{ marginTop: 0 }}>
          <div className="stat">
            <div className="label">항목</div>
            <div className="value">{assumptions.length}</div>
          </div>
          <div className="stat">
            <div className="label">승인</div>
            <div className="value">{approved}</div>
          </div>
          <div className="stat">
            <div className="label">수정 요청</div>
            <div className="value">{needsChange}</div>
          </div>
          <div className="stat">
            <div className="label">미검수</div>
            <div className="value">{assumptions.length - approved - needsChange}</div>
          </div>
        </div>

        {groups.map((group) => (
          <div className="card" key={group} style={{ marginBottom: "1.5rem" }}>
            <h2>{group}</h2>
            {assumptions
              .filter((a) => a.group === group)
              .map((a, i, arr) => {
                const r = reviewByKey.get(a.key);
                const status = (r?.status ?? "pending") as ParameterReviewStatus;
                return (
                  <div
                    key={a.key}
                    style={{ padding: "0.9rem 0", borderBottom: i < arr.length - 1 ? "1px solid var(--steel-line)" : "none" }}
                  >
                    <div style={{ display: "flex", gap: "0.6rem", alignItems: "baseline", flexWrap: "wrap" }}>
                      <strong>{a.title}</strong>
                      <span className={`pill review-${status}`} style={{ fontSize: "0.7rem" }}>
                        {PARAMETER_REVIEW_STATUS_LABELS[status]}
                      </span>
                      {r && (
                        <span className="hint">
                          {r.reviewedBy.email} · {r.reviewedAt.toISOString().slice(0, 10)}
                        </span>
                      )}
                    </div>
                    <pre
                      style={{
                        margin: "0.4rem 0",
                        whiteSpace: "pre-wrap",
                        font: "inherit",
                        fontVariantNumeric: "tabular-nums",
                        background: "var(--steel)",
                        padding: "0.5rem 0.7rem",
                        borderRadius: "6px",
                      }}
                    >
                      {a.value}
                    </pre>
                    <p className="hint" style={{ margin: 0 }}>
                      근거: {a.source} · 위치: <code>{a.where}</code>
                    </p>
                    {r?.note && (
                      <p style={{ margin: "0.3rem 0 0", fontSize: "0.88rem" }}>
                        메모: {r.note}
                      </p>
                    )}
                    <ParameterReviewForm assumptionKey={a.key} initialStatus={status} initialNote={r?.note ?? ""} />
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </>
  );
}
