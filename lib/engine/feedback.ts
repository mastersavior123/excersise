/**
 * MD 7장 "자동 감량 조건"의 판정 로직만 담은 순수 함수. DB 조회·쓰기는
 * lib/engine/rebalance.ts에서 이 함수들을 조합해 처리한다.
 */

export interface WellnessInput {
  sleepHours: number | null;
  pain: number | null;
  motivation: number | null;
}

/** MD 7장 웰니스 임계값: 수면≤5h · 통증≥6/10 · 의욕≤3/10 */
export const WELLNESS_THRESHOLDS = { sleepHoursMax: 5, painMin: 6, motivationMax: 3 } as const;

/** 수면≤5h · 통증≥6/10 · 의욕≤3/10 중 몇 개에 해당하는지 */
export function wellnessFlagCount(input: WellnessInput): number {
  let count = 0;
  if (input.sleepHours !== null && input.sleepHours <= WELLNESS_THRESHOLDS.sleepHoursMax) count++;
  if (input.pain !== null && input.pain >= WELLNESS_THRESHOLDS.painMin) count++;
  if (input.motivation !== null && input.motivation <= WELLNESS_THRESHOLDS.motivationMax) count++;
  return count;
}

/** MD 7장: "2개 이상이면 당일 볼륨 30~40% 감량" */
export function hasWellnessOverload(input: WellnessInput): boolean {
  return wellnessFlagCount(input) >= 2;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export interface LoadPoint {
  rpe: number;
  durationMinutes: number;
}

function sessionLoad(p: LoadPoint): number {
  return p.rpe * p.durationMinutes;
}

// 원 설계 문서는 "개인 28일 중앙값"을 기준으로 삼지만, 프로그램이 4주(28일)짜리라
// 프로그램 시작 시점엔 그만한 이력이 없다. 대신 "현재 프로그램에서 지금까지 완료한
// 세션"을 모수로 쓰고, 최소 3건이 쌓이기 전에는 판정을 보류한다 — 데이터가 없는데
// 있는 척 판정하지 않는다는 원칙(Phase 0 이후 계속 지켜온 것)의 연장.
export const MIN_HISTORY_FOR_LOAD_TREND = 3;
export const LOAD_SPIKE_THRESHOLD = 1.3;

/** MD 7장: "최근 3일 session-RPE×분이 중앙값보다 30%+ 높으면 다음 Big을 Little로" */
export function isLoadSpiking(recent: LoadPoint[], historical: LoadPoint[]): boolean {
  if (historical.length < MIN_HISTORY_FOR_LOAD_TREND || recent.length === 0) return false;
  const recentAvg = recent.reduce((sum, p) => sum + sessionLoad(p), 0) / recent.length;
  const baseline = median(historical.map(sessionLoad));
  if (baseline === 0) return false;
  return recentAvg > baseline * LOAD_SPIKE_THRESHOLD;
}

/** MD 9장 26행: "피로 조건 충족 시" 디로드를 앞당기는 판정 — 최근 3일 중 2일 이상 웰니스 과부하 */
export function chronicFatigueTriggered(recentInputs: WellnessInput[]): boolean {
  return recentInputs.filter(hasWellnessOverload).length >= 2;
}
