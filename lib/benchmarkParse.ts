/**
 * Phase 7 — 벤치마크 결과 자유 텍스트 파서(순수 함수). 원문은 항상 그대로 저장하고, 여기서 뽑은
 * 구조화 값은 리더보드 정렬에만 쓴다. 해석이 안 되면 kind=null로 두고 리더보드에서 "미분류"로
 * 따로 보여준다 — 억지로 숫자를 만들어내지 않는다.
 *
 * 인식하는 형태(대소문자·공백 무시):
 *  - 시간:        12:34 · 1:02:03 · 12분34초 · 754초
 *  - 반복:        185 · 185회 · 185 reps
 *  - 라운드+반복: 5+10 · 5 rounds + 10 reps · 5라운드 10회 · 5R+10
 *  - 중량:        95kg · 225lb · 225 lbs (lb→kg 환산)
 * 꼬리표 Rx / Scaled / 스케일 은 결과값과 분리해 scaled 플래그 힌트로 돌려준다.
 */

export type BenchmarkKind = "time" | "reps" | "rounds_reps" | "load";

export interface ParsedBenchmark {
  kind: BenchmarkKind | null;
  seconds?: number;
  reps?: number;
  rounds?: number;
  loadKg?: number;
  /** 원문에 Scaled/스케일 표기가 있으면 true, Rx가 있으면 false, 없으면 undefined */
  scaledHint?: boolean;
}

const LB_TO_KG = 0.45359237;

export function parseBenchmarkResult(raw: string): ParsedBenchmark {
  let text = raw.trim().toLowerCase();
  let scaledHint: boolean | undefined;
  if (/\b(scaled|sc)\b|스케일/.test(text)) scaledHint = true;
  else if (/\brx'?d?\b|알엑스/.test(text)) scaledHint = false;
  text = text
    .replace(/\b(scaled|sc|rx'?d?)\b|스케일(드)?|알엑스/g, " ")
    .replace(/[(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const base = { scaledHint };

  // 시간 h:mm:ss / mm:ss
  const colon = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (colon) {
    const [, a, b, c] = colon;
    const seconds = c ? Number(a) * 3600 + Number(b) * 60 + Number(c) : Number(a) * 60 + Number(b);
    return { ...base, kind: "time", seconds };
  }
  const korTime = text.match(/^(?:(\d+)\s*분)?\s*(?:(\d+)\s*초)?$/);
  if (korTime && (korTime[1] || korTime[2]) && /분|초/.test(text)) {
    return { ...base, kind: "time", seconds: Number(korTime[1] ?? 0) * 60 + Number(korTime[2] ?? 0) };
  }

  // 라운드+반복
  const rounds = text.match(/^(\d+)\s*(?:r|rounds?|라운드)?\s*\+\s*(\d+)\s*(?:reps?|회)?$/) ?? text.match(/^(\d+)\s*(?:rounds?|라운드)\s*(\d+)\s*(?:reps?|회)?$/);
  if (rounds) return { ...base, kind: "rounds_reps", rounds: Number(rounds[1]), reps: Number(rounds[2]) };

  // 중량
  const load = text.match(/^(\d+(?:\.\d+)?)\s*(kg|kgs|lb|lbs|파운드|킬로)$/);
  if (load) {
    const n = Number(load[1]);
    const isLb = /lb|파운드/.test(load[2]);
    return { ...base, kind: "load", loadKg: Math.round((isLb ? n * LB_TO_KG : n) * 10) / 10 };
  }

  // 반복
  const reps = text.match(/^(\d+)\s*(?:reps?|회)?$/);
  if (reps) return { ...base, kind: "reps", reps: Number(reps[1]) };

  return { ...base, kind: null };
}

/**
 * 같은 kind끼리만 비교한다. 시간은 짧을수록, 나머지는 클수록 좋다. 반환값이 음수면 a가 더 좋다.
 * kind가 다르면(예: 타임캡 안에 끝낸 사람=time, 못 끝낸 사람=reps) time이 항상 앞선다 —
 * For time 워크아웃에서 캡 안에 끝낸 기록이 못 끝낸 기록보다 좋다는 CrossFit 관례.
 */
const KIND_ORDER: Record<BenchmarkKind, number> = { time: 0, rounds_reps: 1, reps: 2, load: 3 };

export function compareBenchmark(a: ParsedBenchmark, b: ParsedBenchmark): number {
  if (!a.kind || !b.kind) return Number(!a.kind) - Number(!b.kind);
  if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  switch (a.kind) {
    case "time":
      return (a.seconds ?? Infinity) - (b.seconds ?? Infinity);
    case "rounds_reps":
      return (b.rounds ?? 0) - (a.rounds ?? 0) || (b.reps ?? 0) - (a.reps ?? 0);
    case "reps":
      return (b.reps ?? 0) - (a.reps ?? 0);
    case "load":
      return (b.loadKg ?? 0) - (a.loadKg ?? 0);
  }
}

export function formatParsed(p: ParsedBenchmark): string {
  switch (p.kind) {
    case "time": {
      const s = p.seconds ?? 0;
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
    }
    case "rounds_reps":
      return `${p.rounds}라운드 + ${p.reps}회`;
    case "reps":
      return `${p.reps}회`;
    case "load":
      return `${p.loadKg}kg`;
    default:
      return "미분류";
  }
}

export const BENCHMARK_KIND_LABELS: Record<BenchmarkKind, string> = {
  time: "시간",
  rounds_reps: "라운드+반복",
  reps: "반복",
  load: "중량",
};
