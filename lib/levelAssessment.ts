import { MOVEMENT_GROUPS, type MovementGroup } from "./constants";

/**
 * 레벨 자동 판정 스코어링. 가중치(기술 40%·상대 1RM 30%·빈도 20%·목표 10%)와 임계값은
 * 코치 검수 전 제품 잠정값이다 — README "아직 남은 미확정 사항"에 명시했다.
 * 실제 검증 데이터가 쌓이면 이 함수만 교체하면 되도록 순수 함수로 분리했다.
 */

export interface LevelAssessmentInput {
  capabilities: Partial<Record<MovementGroup, boolean>>;
  squatOneRmKg: number | null;
  bodyweightKg: number | null;
  recentTrainingFrequencyPerWeek: number | null; // 0~7
  primaryGoals: string[];
}

export interface LevelAssessmentBreakdown {
  skill: number;
  relativeOneRm: number;
  frequency: number;
  goal: number;
}

export interface LevelAssessmentResult {
  score: number; // 0~10
  breakdown: LevelAssessmentBreakdown;
  suggestedLevel: 1 | 2 | 3 | 4;
}

export const LEVEL_WEIGHTS = { skill: 0.4, relativeOneRm: 0.3, frequency: 0.2, goal: 0.1 } as const;
const WEIGHTS = LEVEL_WEIGHTS;

/** 백스쿼트 1RM/체중 비율 구간 → 점수. 성별·연령 보정 없이 하나의 척도만 쓴다(코치 검수 항목). */
export const RELATIVE_ONE_RM_BANDS: [maxRatioExclusive: number, score: number][] = [
  [0.5, 1],
  [0.75, 3],
  [1.0, 5],
  [1.5, 7],
  [2.0, 9],
];
export const RELATIVE_ONE_RM_TOP_SCORE = 10;

/** 종합 점수(0~10) → 레벨 컷오프: >8.5 → L4, >6 → L3, >3 → L2, 그 외 L1 */
export const LEVEL_CUTOFFS = { level4: 8.5, level3: 6, level2: 3 } as const;

function scoreSkill(capabilities: Partial<Record<MovementGroup, boolean>>): number {
  const passed = MOVEMENT_GROUPS.filter((group) => capabilities[group]).length;
  return (passed / MOVEMENT_GROUPS.length) * 10;
}

function scoreRelativeOneRm(squatOneRmKg: number | null, bodyweightKg: number | null): number {
  if (!squatOneRmKg || !bodyweightKg) return 0;
  const ratio = squatOneRmKg / bodyweightKg;
  for (const [max, score] of RELATIVE_ONE_RM_BANDS) if (ratio < max) return score;
  return RELATIVE_ONE_RM_TOP_SCORE;
}

function scoreFrequency(freq: number | null): number {
  if (freq === null) return 0;
  return Math.min(10, (freq / 7) * 10);
}

function scoreGoal(goals: string[]): number {
  if (goals.includes("competition")) return 10;
  if (goals.includes("weightlifting") || goals.includes("gymnastics")) return 7;
  return 5;
}

export function assessLevel(input: LevelAssessmentInput): LevelAssessmentResult {
  const skill = scoreSkill(input.capabilities);
  const relativeOneRm = scoreRelativeOneRm(input.squatOneRmKg, input.bodyweightKg);
  const frequency = scoreFrequency(input.recentTrainingFrequencyPerWeek);
  const goal = scoreGoal(input.primaryGoals);

  const score =
    skill * WEIGHTS.skill +
    relativeOneRm * WEIGHTS.relativeOneRm +
    frequency * WEIGHTS.frequency +
    goal * WEIGHTS.goal;

  let suggestedLevel: 1 | 2 | 3 | 4 = 1;
  if (score > LEVEL_CUTOFFS.level4) suggestedLevel = 4;
  else if (score > LEVEL_CUTOFFS.level3) suggestedLevel = 3;
  else if (score > LEVEL_CUTOFFS.level2) suggestedLevel = 2;

  return { score, breakdown: { skill, relativeOneRm, frequency, goal }, suggestedLevel };
}
