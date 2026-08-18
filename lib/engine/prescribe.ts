import type { Exercise } from "@prisma/client";
import type { Lift } from "../constants";
import { FAMILY_TO_ONE_RM_LIFT, LOAD_TABLE_BY_FAMILY } from "./constants";

export interface Prescription {
  doseRaw: string;
  setsMin?: number;
  setsMax?: number;
  repsMin?: number;
  repsMax?: number;
  loadKg?: number;
  percent1RM?: number;
}

function roundToPlate(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}

/**
 * %1RM은 스쿼트/데드리프트/숄더프레스 계열(FAMILY_TO_ONE_RM_LIFT)이면서 세트×회로 처방되는
 * 운동에만 적용한다. 클린·스내치는 의도적으로 제외했다(constants.ts 주석 참고). 그 외 모든
 * 운동은 Exercise_DB의 기본 처방을 그대로 쓰되, 디로드 주에는 세트 수를 약 70%로 줄인다
 * (MD 9장 "디로드 주 60~75%" 범위의 중간값).
 */
export function prescribe(
  exercise: Exercise,
  oneRmByLift: Partial<Record<Lift, number>>,
  weekIndex: 1 | 2 | 3 | 4,
  isDeload: boolean
): Prescription {
  const base: Prescription = {
    doseRaw: exercise.defaultDoseRaw,
    setsMin: exercise.defaultDoseSetsMin ?? undefined,
    setsMax: exercise.defaultDoseSetsMax ?? undefined,
    repsMin: exercise.defaultDoseRepsMin ?? undefined,
    repsMax: exercise.defaultDoseRepsMax ?? undefined,
  };

  if (isDeload && base.setsMin && base.setsMax) {
    base.setsMin = Math.max(1, Math.round(base.setsMin * 0.7));
    base.setsMax = Math.max(base.setsMin, Math.round(base.setsMax * 0.7));
  }

  const lift = FAMILY_TO_ONE_RM_LIFT[exercise.family];
  const oneRm = lift ? oneRmByLift[lift] : undefined;
  if (lift && oneRm && exercise.doseUnit === "세트×회") {
    const table = LOAD_TABLE_BY_FAMILY[lift];
    const pct = isDeload ? table[3] : table[weekIndex - 1];
    return { ...base, loadKg: roundToPlate(oneRm * pct), percent1RM: pct };
  }

  return base;
}
