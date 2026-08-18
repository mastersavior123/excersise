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

function isLowIntensityText(text: string | null): boolean {
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
      if (isLowIntensityText(day.conditioningText)) totals.V04 += mid;
      else totals.V03 += mid;
    }
  }

  return totals;
}

/**
 * V01이 상한을 넘으면 가장 마지막 날부터 보조(accessory) 블록을 하나씩 제거한다
 * (MD 9장 10단계 "범위 초과 시 보조 제거 → 세트 감소 → 운동 회귀 → 저강도 전환" 중 1단계만
 * 구현한 v1 — 나머지 세 단계는 README "축소된 범위"에 남겨둔 다음 반복 작업이다).
 * 제거된 블록이 있으면 true를 반환한다(더 시도해볼 여지가 있다는 뜻).
 */
export function removeOneAccessoryBlock(days: LedgerDay[]): boolean {
  for (let i = days.length - 1; i >= 0; i--) {
    const idx = days[i].blocks.findIndex((b) => b.slot === "accessory");
    if (idx !== -1) {
      days[i].blocks.splice(idx, 1);
      return true;
    }
  }
  return false;
}
