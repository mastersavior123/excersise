import type { Exercise } from "@prisma/client";
import type { Prescription } from "./prescribe";
import type { SlotCode } from "./constants";

export interface LedgerBlock {
  slot: SlotCode;
  exercise: Exercise;
  prescription: Prescription;
}

export interface LedgerDay {
  conditioningText: string | null; // session_template.conditioning (해당 요일 템플릿의 컨디셔닝 목표, 예: '7~10분')
  /** Phase 7 장부 조정 4단계 "저강도 전환"이 적용되면 true — 컨디셔닝 분이 V03에서 V04로 옮겨간다 */
  lowIntensityOverride?: boolean;
  blocks: LedgerBlock[];
}

export type LedgerId = "V01" | "V02" | "V03" | "V04" | "V06";

export type LedgerTotals = Record<LedgerId, number>;

function parseMinutesRange(text: string | null): { min: number; max: number } | null {
  if (!text) return null;
  const match = text.match(/(\d+)(?:[~\-](\d+))?\s*분/);
  if (!match) return null;
  const min = Number(match[1]);
  const max = match[2] ? Number(match[2]) : min;
  return { min, max };
}

export function isLowIntensityText(text: string | null): boolean {
  if (!text) return false;
  return /저강도|zone\s*2|쉬운/i.test(text);
}

/**
 * V01·V02·V04(또는V03)·V06만 계산한다. V05(체조 기술연습 분)는 세션 템플릿에 슬롯별 목표
 * 시간이 아니라 컨디셔닝 총 시간만 있어서 정직하게 계산할 방법이 없어 뺐다 — 데이터가 뒷받침
 *하지 않는 값을 지어내지 않는다는 Phase 0 이후 원칙을 그대로 따른다.
 */
export function computeWeeklyLedgers(days: LedgerDay[]): LedgerTotals {
  const totals: LedgerTotals = { V01: 0, V02: 0, V03: 0, V04: 0, V06: 0 };

  for (const day of days) {
    for (const block of day.blocks) {
      const { slot, exercise, prescription } = block;
      const sets = prescription.setsMax ?? prescription.setsMin;
      const reps = prescription.repsMax ?? prescription.repsMin;

      if (slot === "main_strength" && sets) totals.V01 += sets;
      if (slot === "accessory" && sets) totals.V01 += sets * 0.5;

      if (exercise.modality === "웨이트리프팅" && exercise.doseUnit === "품질회" && sets && reps) {
        totals.V02 += sets * reps;
      }

      if (exercise.impact === "높음" && reps) {
        totals.V06 += reps * (sets ?? 1);
      }
    }

    const range = parseMinutesRange(day.conditioningText);
    if (range) {
      const mid = (range.min + range.max) / 2;
      if (day.lowIntensityOverride || isLowIntensityText(day.conditioningText)) totals.V04 += mid;
      else totals.V03 += mid;
    }
  }

  return totals;
}

// ---------------------------------------------------------------------------
// MD 9장 10단계 "범위 초과 시 보조 제거 → 세트 감소 → 운동 회귀 → 저강도 전환".
// Phase 2에서는 1단계만 있었다. Phase 7에서 나머지 세 단계를 붙이되, 각 단계를 "그 단계가
// 실제로 낮출 수 있는 장부"에 연결했다: 보조 제거·세트 감소는 V01(근력 하드세트), 운동 회귀는
// V06(고충격 접촉 — 고충격 동작을 저충격 대체로), 저강도 전환은 V03(고강도 메트콘 분 → V04).
// 코치 관점에서 "V01이 넘치는데 메트콘을 Zone2로 바꾼다"는 식의 엉뚱한 조정을 피하기 위함이다.
// 모든 함수는 순수 함수이고, 변경했으면 사람이 읽을 설명을 돌려준다(생성 시점 이벤트로 저장).
// ---------------------------------------------------------------------------

export interface LedgerAdjustment {
  rule: "ledger_v01_accessory" | "ledger_v01_sets" | "ledger_v06_regress" | "ledger_v03_low_intensity";
  action: string;
}

/** 1단계: 가장 마지막 날부터 보조(accessory) 블록을 하나 제거 */
export function removeOneAccessoryBlock(days: LedgerDay[]): LedgerAdjustment | null {
  for (let i = days.length - 1; i >= 0; i--) {
    const idx = days[i].blocks.findIndex((b) => b.slot === "accessory");
    if (idx !== -1) {
      const [removed] = days[i].blocks.splice(idx, 1);
      return { rule: "ledger_v01_accessory", action: `보조 블록 제거: ${removed.exercise.nameKo} (${i + 1}번째 훈련일)` };
    }
  }
  return null;
}

const MIN_STRENGTH_SETS = 2;

/** 2단계: 세트 수가 가장 많은 주근력 블록의 세트를 1 줄인다(최소 2세트까지) */
export function reduceOneStrengthSet(days: LedgerDay[]): LedgerAdjustment | null {
  let target: { day: number; block: LedgerBlock } | null = null;
  let maxSets = MIN_STRENGTH_SETS;
  days.forEach((day, i) => {
    for (const b of day.blocks) {
      if (b.slot !== "main_strength") continue;
      const sets = b.prescription.setsMax ?? b.prescription.setsMin ?? 0;
      if (sets > maxSets) {
        maxSets = sets;
        target = { day: i, block: b };
      }
    }
  });
  if (!target) return null;
  const { day, block } = target as { day: number; block: LedgerBlock };
  const p = block.prescription;
  const before = p.setsMax ?? p.setsMin!;
  const after = before - 1;
  p.setsMax = after;
  if (p.setsMin && p.setsMin > after) p.setsMin = after;
  p.adjustedBy = [...(p.adjustedBy ?? []), "ledger_v01_sets"];
  return {
    rule: "ledger_v01_sets",
    action: `주근력 세트 감소: ${block.exercise.nameKo} ${before}→${after}세트 (${day + 1}번째 훈련일)`,
  };
}

export interface RegressionLookup {
  /** exerciseId → 해석된 1차 회귀 운동(있으면). 고충격 동작의 회귀가 저충격이면 그것을 쓴다. */
  resolvedRegression: (exerciseId: string) => Exercise | null;
  /** 같은 슬롯에서 쓸 수 있는 저충격 대체 후보(회귀가 해석되지 않았을 때) */
  lowImpactSubstitute: (slot: SlotCode, exclude: Set<string>) => Exercise | null;
}

/**
 * 3단계: 고충격(impact='높음') 블록 하나를 회귀 운동(해석된 것이 있으면) 또는 저충격 대체 운동으로
 * 바꾼다. 처방은 대체 운동의 기본 처방으로 새로 잡아야 하므로 호출자가 prescribeFn을 넘긴다.
 * 대체 후보도 없으면 블록을 제거한다(V06 초과를 그대로 두는 것보다 안전 — 고충격은 부상 위험 항목).
 */
export function regressOneHighImpactBlock(
  days: LedgerDay[],
  lookup: RegressionLookup,
  prescribeFn: (exercise: Exercise) => Prescription
): LedgerAdjustment | null {
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i];
    const idx = day.blocks.findIndex(
      (b) => b.exercise.impact === "높음" && !b.prescription.adjustedBy?.includes("ledger_v06_regress")
    );
    if (idx === -1) continue;
    const block = day.blocks[idx];
    const inDay = new Set(day.blocks.map((b) => b.exercise.exerciseId));

    const regression = lookup.resolvedRegression(block.exercise.exerciseId);
    const replacement =
      regression && regression.impact !== "높음" && !inDay.has(regression.exerciseId)
        ? regression
        : lookup.lowImpactSubstitute(block.slot, inDay);

    if (!replacement) {
      day.blocks.splice(idx, 1);
      return { rule: "ledger_v06_regress", action: `고충격 블록 제거(대체 후보 없음): ${block.exercise.nameKo}` };
    }
    const kind = regression && replacement.exerciseId === regression.exerciseId ? "회귀" : "저충격 대체";
    const next = prescribeFn(replacement);
    next.adjustedBy = [...(block.prescription.adjustedBy ?? []), "ledger_v06_regress"];
    day.blocks[idx] = { slot: block.slot, exercise: replacement, prescription: next };
    return {
      rule: "ledger_v06_regress",
      action: `고충격 동작 ${kind}: ${block.exercise.nameKo} → ${replacement.nameKo} (${i + 1}번째 훈련일)`,
    };
  }
  return null;
}

/**
 * 4단계: 아직 고강도인 컨디셔닝 하루를 저강도(Zone 2)로 전환. 코치라면 메트콘이 있는 큰 날의
 * 6~12분 메트콘을 Zone 2로 바꾸지 않는다 — 에르그/달리기 컨디셔닝 슬롯이 있고 메트콘이 없는 날
 * (작은 날)을 먼저, 그다음 컨디셔닝 시간이 긴 날을 전환한다.
 */
export function convertOneDayToLowIntensity(days: LedgerDay[]): LedgerAdjustment | null {
  const candidates = days
    .map((day, i) => ({ day, i, range: parseMinutesRange(day.conditioningText) }))
    .filter(({ day, range }) => range && !day.lowIntensityOverride && !isLowIntensityText(day.conditioningText))
    .map((c) => ({
      ...c,
      erg: c.day.blocks.some((b) => b.slot === "conditioning") && !c.day.blocks.some((b) => b.slot === "metcon"),
      mid: (c.range!.min + c.range!.max) / 2,
    }))
    .sort((a, b) => Number(b.erg) - Number(a.erg) || b.mid - a.mid || b.i - a.i);
  const target = candidates[0];
  if (!target) return null;
  target.day.lowIntensityOverride = true;
  return {
    rule: "ledger_v03_low_intensity",
    action: `컨디셔닝 저강도 전환: ${target.i + 1}번째 훈련일 '${target.day.conditioningText}' → Zone 2${target.erg ? " (에르그 컨디셔닝 날 우선)" : ""}`,
  };
}
