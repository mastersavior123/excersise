import type { Prescription } from "./prescribe";

export function formatPrescription(p: Prescription): string {
  const parts: string[] = [];

  if (p.setsMin !== undefined || p.setsMax !== undefined) {
    const sets = p.setsMin === p.setsMax || p.setsMax === undefined ? `${p.setsMin}` : `${p.setsMin}~${p.setsMax}`;
    parts.push(`${sets}세트`);
  }
  if (p.repsMin !== undefined || p.repsMax !== undefined) {
    const reps = p.repsMin === p.repsMax || p.repsMax === undefined ? `${p.repsMin}` : `${p.repsMin}~${p.repsMax}`;
    parts.push(`${reps}회`);
  }

  let result = parts.length > 0 ? parts.join(" × ") : p.doseRaw;

  if (p.loadKg !== undefined && p.percent1RM !== undefined) {
    result += ` @ ${p.loadKg}kg (${Math.round(p.percent1RM * 100)}%1RM)`;
  }

  return result;
}

export const LEDGER_LABELS: Record<string, string> = {
  V01: "근력 하드세트/주",
  V02: "역도 품질반복/주",
  V03: "고강도 메트콘(분)/주",
  V04: "Zone 2 저강도(분)/주",
  V06: "고충격 접촉/주",
};

export const SLOT_LABELS: Record<string, string> = {
  warmup: "워밍업",
  skill_power: "기술/파워",
  main_strength: "주근력",
  accessory: "보조",
  metcon: "메트콘",
  conditioning: "컨디셔닝",
  cooldown: "쿨다운",
};

export const DAY_TYPE_LABELS: Record<string, string> = { big: "큰 날", small: "작은 날", mixed: "중간/혼합" };

/** program_adjustment_event.trigger_rule → 사람이 읽는 이름 (Phase 4 로그 시점 + Phase 7 생성/블록 결과 규칙) */
export const TRIGGER_RULE_LABELS: Record<string, string> = {
  wellness_2of3: "당일 웰니스 감량",
  rpe_load_spike: "부하 급증 감량",
  chronic_fatigue: "조기 디로드",
  ledger_v01_accessory: "장부 V01: 보조 제거",
  ledger_v01_sets: "장부 V01: 세트 감소",
  ledger_v06_regress: "장부 V06: 고충격 회귀",
  ledger_v03_low_intensity: "장부 V03: 저강도 전환",
  consecutive_conflict: "연속일 계열 충돌 회피",
  consecutive_day_cap: "연속 훈련일 상한 경고",
  strength_hold: "근력 실패: 중량 유지",
  strength_cut: "근력 연속 실패: 감량",
  skill_regress: "기술 연속 실패: 회귀 교체",
  skill_regress_recommended: "기술 연속 실패: 회귀 권장",
};

/** prescription.adjustedBy 태그 → 짧은 배지 문구 */
export const ADJUST_TAG_LABELS: Record<string, string> = {
  wellness_2of3: "웰니스 감량",
  rpe_load_spike: "부하 급증 감량",
  chronic_fatigue: "조기 디로드",
  ledger_v01_sets: "세트 감소(장부)",
  ledger_v06_regress: "고충격 회귀(장부)",
  strength_hold: "중량 유지",
  strength_cut: "감량(연속 실패)",
  skill_regress: "회귀 운동으로 교체",
  skill_regress_recommended: "회귀 권장",
};

export const BLOCK_OUTCOME_LABELS: Record<string, string> = { success: "성공", partial: "부분", failed: "실패" };
