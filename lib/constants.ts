export const LIFTS = ["squat", "deadlift", "press", "clean", "snatch"] as const;
export type Lift = (typeof LIFTS)[number];

export const LIFT_LABELS: Record<Lift, string> = {
  squat: "백 스쿼트",
  deadlift: "데드리프트",
  press: "스트릭트 숄더프레스",
  clean: "클린",
  snatch: "스내치",
};

// Level_Profiles 판정 근거 4개 기술 그룹 (MD 6장)
export const MOVEMENT_GROUPS = [
  "basic_squat_hinge_press_pull",
  "oly_snatch",
  "oly_clean_jerk",
  "pullup_inversion",
] as const;
export type MovementGroup = (typeof MOVEMENT_GROUPS)[number];

export const MOVEMENT_GROUP_LABELS: Record<MovementGroup, string> = {
  basic_squat_hinge_press_pull: "스쿼트·힌지·오버헤드·당기기 기본 동작을 안전한 자세로 할 수 있다",
  oly_snatch: "PVC/빈 바로 스내치 전체 동작(3단계 풀+캐치)을 수행할 수 있다",
  oly_clean_jerk: "PVC/빈 바로 클린과 저크 전체 동작을 수행할 수 있다",
  pullup_inversion: "스트릭트 풀업 또는 핸드스탠드(벽 지지)를 30초 이상 유지할 수 있다",
};

// 온보딩에서 수집하지만 이번 phase 1의 레벨 판정에는 직접 반영하지 않는 우선 목표 옵션
export const GOAL_OPTIONS = [
  "general_fitness",
  "strength",
  "weightlifting",
  "gymnastics",
  "competition",
] as const;
export type Goal = (typeof GOAL_OPTIONS)[number];

export const GOAL_LABELS: Record<Goal, string> = {
  general_fitness: "일반 체력",
  strength: "근력",
  weightlifting: "역도(스내치/클린/저크)",
  gymnastics: "체조",
  competition: "대회 준비",
};

// Generator_Rules 1행 BLOCK 게이트의 근거. blocking=true는 프로그램 생성 시 즉시 중단 대상,
// blocking=false는 주의가 필요하지만 별도 규칙 세트로 다루는 항목(MD 11장 6번).
export const HEALTH_FLAG_TYPES = [
  "acute_pain",
  "chest_pain",
  "fainting",
  "neuro_symptom",
  "surgery",
  "pregnancy",
  "cardio_warning",
] as const;
export type HealthFlagType = (typeof HEALTH_FLAG_TYPES)[number];

export const HEALTH_FLAG_LABELS: Record<HealthFlagType, { label: string; blocking: boolean }> = {
  acute_pain: { label: "날카로운 급성 통증이 있다", blocking: true },
  chest_pain: { label: "흉통이 있다", blocking: true },
  fainting: { label: "운동 중 실신감·어지러움이 있다", blocking: true },
  neuro_symptom: { label: "저림·마비 등 신경학적 증상이 있다", blocking: true },
  surgery: { label: "최근 수술 이력이 있다", blocking: false },
  pregnancy: { label: "임신 중이다", blocking: false },
  cardio_warning: { label: "심혈관 질환 관련 경고를 받은 적이 있다", blocking: false },
};

// Exercise_DB.장비에 실제 등장하는 값들을 참고해 온보딩에서 고를 수 있는 장비 목록을 추렸다.
export const EQUIPMENT_OPTIONS = [
  "바벨/플레이트",
  "덤벨",
  "케틀벨",
  "풀업바/링",
  "박스",
  "로잉/바이크/스키 에르그",
  "PVC/밴드",
  "없음(맨몸만)",
] as const;
export type Equipment = (typeof EQUIPMENT_OPTIONS)[number];

export const OCCUPATION_ACTIVITY_OPTIONS = ["sedentary", "active", "shift_work"] as const;
export type OccupationActivity = (typeof OCCUPATION_ACTIVITY_OPTIONS)[number];

export const OCCUPATION_ACTIVITY_LABELS: Record<OccupationActivity, string> = {
  sedentary: "주로 앉아서 근무",
  active: "활동량이 많은 근무",
  shift_work: "교대 근무",
};
