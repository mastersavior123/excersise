import { LOAD_TABLE_BY_FAMILY } from "./engine/constants";
import { LEVEL_CUTOFFS, LEVEL_WEIGHTS, RELATIVE_ONE_RM_BANDS, RELATIVE_ONE_RM_TOP_SCORE } from "./levelAssessment";
import { LOAD_SPIKE_THRESHOLD, MIN_HISTORY_FOR_LOAD_TREND, WELLNESS_THRESHOLDS } from "./engine/feedback";
import {
  EARLY_DELOAD_FACTOR,
  LOAD_SPIKE_CUT_FACTOR,
  STRENGTH_CUT_FACTOR,
  WELLNESS_CUT_FACTOR,
} from "./engine/rebalance";

/**
 * 코드에 박혀 있는 "코치 검수 전 잠정값"의 목록. /coach/assumptions가 이 값을 그대로 렌더하고,
 * 검수 상태(승인/수정 요청)는 parameter_review 테이블에 남긴다. 값을 여기서 읽는 이유는 문서와
 * 코드가 어긋나지 않게 하기 위해서다 — README에 숫자를 따로 적어두면 코드가 바뀔 때 반드시 어긋난다.
 */
export interface Assumption {
  key: string;
  group: string;
  title: string;
  value: string;
  source: string;
  where: string;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function listAssumptions(): Assumption[] {
  const load = Object.entries(LOAD_TABLE_BY_FAMILY)
    .map(([lift, t]) => `${lift}: W1 ${pct(t[0])} · W2 ${pct(t[1])} · W3 ${pct(t[2])} · 디로드 ${pct(t[3])}`)
    .join("\n");
  const bands = RELATIVE_ONE_RM_BANDS.map(([max, score]) => `<${max} → ${score}점`).join(", ");

  return [
    {
      key: "load_table",
      group: "처방",
      title: "주차별 %1RM 테이블 (스쿼트/힌지/수직밀기 계열)",
      value: load,
      source: "ACSM 2~3세트/RIR1~4, StrongLifts 선형 진행을 참고한 제품 잠정값",
      where: "lib/engine/constants.ts LOAD_TABLE_BY_FAMILY",
    },
    {
      key: "clean_snatch_no_percent",
      group: "처방",
      title: "클린·스내치는 %1RM을 쓰지 않고 Exercise_DB 기본 처방(품질회)을 그대로 사용",
      value: "적용 안 함 (MD 4장 원칙 7: 반복 수보다 성공률·속도·자세 우선)",
      source: "원 설계 문서의 '미정' 항목을 Phase 2에서 '적용 안 함'으로 확정",
      where: "lib/engine/constants.ts FAMILY_TO_ONE_RM_LIFT",
    },
    {
      key: "level_weights",
      group: "레벨 판정",
      title: "레벨 스코어 가중치",
      value: `기술 ${pct(LEVEL_WEIGHTS.skill)} · 상대 1RM ${pct(LEVEL_WEIGHTS.relativeOneRm)} · 최근 빈도 ${pct(LEVEL_WEIGHTS.frequency)} · 목표 ${pct(LEVEL_WEIGHTS.goal)}`,
      source: "MD 6장 Level_Profiles 기준을 점수화한 제품 잠정값",
      where: "lib/levelAssessment.ts LEVEL_WEIGHTS",
    },
    {
      key: "relative_one_rm_bands",
      group: "레벨 판정",
      title: "백스쿼트 1RM/체중 비율 구간 점수 (성별·연령 보정 없음)",
      value: `${bands}, 그 외 ${RELATIVE_ONE_RM_TOP_SCORE}점`,
      source: "제품 잠정값 — 성별·연령별 표준이 없어 단일 척도",
      where: "lib/levelAssessment.ts RELATIVE_ONE_RM_BANDS",
    },
    {
      key: "level_cutoffs",
      group: "레벨 판정",
      title: "종합 점수(0~10) → 레벨 컷오프",
      value: `>${LEVEL_CUTOFFS.level4} → L4 · >${LEVEL_CUTOFFS.level3} → L3 · >${LEVEL_CUTOFFS.level2} → L2 · 그 외 L1`,
      source: "제품 잠정값. 아래 '레벨 판정 일치율'이 낮으면 먼저 의심할 항목",
      where: "lib/levelAssessment.ts LEVEL_CUTOFFS",
    },
    {
      key: "wellness_thresholds",
      group: "피드백 루프",
      title: "당일 웰니스 과부하 임계값 (3개 중 2개 이상이면 발동)",
      value: `수면 ≤ ${WELLNESS_THRESHOLDS.sleepHoursMax}h · 통증 ≥ ${WELLNESS_THRESHOLDS.painMin}/10 · 의욕 ≤ ${WELLNESS_THRESHOLDS.motivationMax}/10`,
      source: "MD 7장 원문 그대로",
      where: "lib/engine/feedback.ts WELLNESS_THRESHOLDS",
    },
    {
      key: "cut_factors",
      group: "피드백 루프",
      title: "자동 감량 계수",
      value: `당일 웰니스 ×${WELLNESS_CUT_FACTOR} (MD '30~40%'의 중간) · 부하 급증 다음 큰 날 ×${LOAD_SPIKE_CUT_FACTOR} · 조기 디로드 ×${EARLY_DELOAD_FACTOR} · 근력 2회 연속 실패 ×${STRENGTH_CUT_FACTOR} (MD '5~10%'의 중간)`,
      source: "MD 7·9장의 범위 표현을 중간값으로 고정한 제품 잠정값",
      where: "lib/engine/rebalance.ts *_FACTOR",
    },
    {
      key: "load_spike",
      group: "피드백 루프",
      title: "부하 급증 판정",
      value: `최근 3일 평균(RPE×분)이 28일 중앙값의 ${LOAD_SPIKE_THRESHOLD}배 초과, 이력 ${MIN_HISTORY_FOR_LOAD_TREND}건 미만이면 판정 보류`,
      source: "MD 7장 '중앙값보다 30%+' 원문 + 최소 이력은 제품 잠정값",
      where: "lib/engine/feedback.ts LOAD_SPIKE_THRESHOLD / MIN_HISTORY_FOR_LOAD_TREND",
    },
    {
      key: "metcon_count",
      group: "생성 엔진",
      title: "메트콘 동작 수",
      value: "Level 1~2: 2동작(커플릿) · Level 3~4: 3동작(트리플릿)",
      source: "MD 원칙 5 '2~3개 보완적 조합' + Level_Profiles 고강도 상한(L1~2는 2, L3~4는 3~4)에 맞춘 제품 잠정값",
      where: "lib/engine/compose.ts metconMovementCount",
    },
    {
      key: "ledger_steps",
      group: "생성 엔진",
      title: "볼륨 장부 초과 시 4단계 조정의 장부 매핑",
      value: "V01 초과 → 보조 제거 → 주근력 세트 감소(최소 2세트) · V06 초과 → 고충격 동작 회귀/저충격 대체 · V03 초과 → 컨디셔닝 저강도 전환(에르그 날 우선)",
      source: "MD 9장 10단계의 순서를 각 장부가 실제로 낮출 수 있는 단계에 연결한 제품 해석",
      where: "lib/engine/ledger.ts, generateProgram.ts",
    },
    {
      key: "consecutive_conflict",
      group: "생성 엔진",
      title: "연속 훈련일 충돌 정의",
      value: "같은 계열 · 주 패턴 토큰 겹침 · 후면사슬 집합(힌지, 힌지/당기기, 올림픽-클린/스내치/풀) 안에서 연속",
      source: "MD 9장 9단계 '동일 관절·그립·후면사슬'을 Exercise_DB 컬럼으로 옮긴 제품 해석",
      where: "lib/engine/compose.ts conflictsWithPrevious",
    },
  ];
}

export const PARAMETER_REVIEW_STATUSES = ["pending", "approved", "needs_change"] as const;
export type ParameterReviewStatus = (typeof PARAMETER_REVIEW_STATUSES)[number];
export const PARAMETER_REVIEW_STATUS_LABELS: Record<ParameterReviewStatus, string> = {
  pending: "미검수",
  approved: "승인",
  needs_change: "수정 요청",
};
