import type { Exercise } from "@prisma/client";
import type { MovementGroup } from "../constants";
import {
  ALWAYS_AVAILABLE_EQUIPMENT,
  EQUIPMENT_TOKEN_TO_CATEGORY,
  FAMILY_PREFIX_TO_CAPABILITY_GROUP,
  KOREAN_SLOT_TOKEN_TO_CODE,
  type SlotCode,
} from "./constants";

export interface NormalizedExercise {
  exercise: Exercise;
  slots: SlotCode[];
}

export function normalizeExercise(exercise: Exercise): NormalizedExercise {
  const slots = exercise.recommendedSlots
    .map((token) => KOREAN_SLOT_TOKEN_TO_CODE[token])
    .filter((code): code is SlotCode => Boolean(code));
  return { exercise, slots };
}

export function equipmentSatisfied(exercise: Exercise, userEquipment: string[]): boolean {
  for (const token of exercise.equipment) {
    if (ALWAYS_AVAILABLE_EQUIPMENT.has(token)) continue;
    const category = EQUIPMENT_TOKEN_TO_CATEGORY[token];
    if (!category) return false; // 온보딩 장비 옵션에 대응되지 않는 장비 → 보수적으로 제외
    if (!userEquipment.includes(category)) return false;
  }
  return true;
}

/**
 * 기술 게이트(MD 원칙 3). skillComplexity가 낮으면(<=2) 항상 통과. 3 이상이면 계열별로
 * 대응하는 기술 체크 그룹을 찾고, 명확히 분류되지 않는 계열은 기본 동작 체크
 * (basic_squat_hinge_press_pull)로 보수적으로 게이트한다 — 47개 고난도 운동 전부를
 * 정교하게 분류하기보다, "기본이 안 되면 고난도 동작 후보에서 제외"가 안전한 기본값이다.
 */
export function requiredCapabilityGroup(exercise: Exercise): MovementGroup | null {
  if (exercise.skillComplexity < 3) return null;

  const family = exercise.family;
  if (family.startsWith("올림픽-스내치")) return "oly_snatch";
  if (family === "올림픽-풀") return exercise.nameKo.includes("스내치") ? "oly_snatch" : "oly_clean_jerk";
  if (family.startsWith("올림픽-클린") || family.startsWith("올림픽-저크") || family.startsWith("올림픽-복합")) {
    return "oly_clean_jerk";
  }
  if (["수직 당기기", "인버전", "인버전 밀기", "인버전 이동", "복합 당김/밀기"].includes(family)) {
    return "pullup_inversion";
  }
  return "basic_squat_hinge_press_pull";
}

export function passesCapabilityGate(
  exercise: Exercise,
  capabilities: Partial<Record<MovementGroup, boolean>>
): boolean {
  const required = requiredCapabilityGroup(exercise);
  if (!required) return true;
  return capabilities[required] === true;
}
