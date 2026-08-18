/**
 * 생성 엔진 상수. exercise.recommended_slots·exercise.equipment는 xlsx 원문을 '/'로만 분리한
 * 자유 텍스트라 session_template.slot_sequence_parsed(seed 시 수동 매핑한 영문 코드)나 온보딩의
 * 장비 체크리스트(lib/constants.ts EQUIPMENT_OPTIONS)와 어휘가 다르다. Phase 0에서 회귀/진행
 * 텍스트가 카탈로그와 13%만 일치했던 것과 같은 종류의 문제라, 여기서도 실제 DB에 나온 값을
 * 전수 조사해 수작업 매핑표를 만들었다(db:validate로 미분류 값이 나오면 이 표를 갱신해야 한다).
 */

export type SlotCode =
  | "warmup"
  | "skill_power"
  | "main_strength"
  | "accessory"
  | "metcon"
  | "conditioning"
  | "cooldown";

// SELECT recommended_slots, count(*) FROM exercise GROUP BY 1 (2026-08-18)로 나온 31가지 조합을
// 구성하는 개별 토큰 전수. "주"·"회귀"는 원본 xlsx 셀의 오탈자로 보이는 값이라 최선 추정으로 매핑했다.
export const KOREAN_SLOT_TOKEN_TO_CODE: Record<string, SlotCode> = {
  워밍업: "warmup",
  기술: "skill_power",
  파워: "skill_power",
  학습: "skill_power",
  근력: "main_strength",
  주근력: "main_strength",
  주: "main_strength", // "주,보조근력"의 절단된 토큰으로 추정
  보조: "accessory",
  보조근력: "accessory",
  회귀: "accessory", // 원문 오염 추정(스케일링 용어가 슬롯 컬럼에 들어간 것으로 보임)
  메트콘: "metcon",
  컨디셔닝: "conditioning",
  회복: "cooldown",
};

// SELECT equipment, count(*) FROM exercise GROUP BY 1로 나온 개별 토큰. 온보딩 8개 옵션
// (lib/constants.ts EQUIPMENT_OPTIONS)보다 훨씬 세분화되어 있어, 헬스장/바닥에 흔히 있는
// 소품은 "항상 보유"로 간주하고 나머지만 사용자가 고른 카테고리와 대조한다.
export const ALWAYS_AVAILABLE_EQUIPMENT = new Set([
  "없음",
  "매트",
  "바닥",
  "벽",
  "고정대",
  "타깃",
  "줄넘기",
]);

export const EQUIPMENT_TOKEN_TO_CATEGORY: Record<string, string> = {
  바벨: "바벨/플레이트",
  랙: "바벨/플레이트",
  플랫폼: "바벨/플레이트",
  벤치: "바벨/플레이트",
  "덤벨 선택": "덤벨",
  "덤벨 2개": "덤벨",
  덤벨: "덤벨",
  케틀벨: "케틀벨",
  바: "풀업바/링",
  풀업바: "풀업바/링",
  링: "풀업바/링",
  평행봉: "풀업바/링",
  패럴렛: "풀업바/링",
  "박스 선택": "박스",
  박스: "박스",
  바이크에르그: "로잉/바이크/스키 에르그",
  로워: "로잉/바이크/스키 에르그",
  스키에르그: "로잉/바이크/스키 에르그",
  PVC: "PVC/밴드",
  밴드: "PVC/밴드",
  // 아래 항목은 온보딩 장비 체크리스트에 대응 카테고리가 없다 — 매핑되지 않은 장비는
  // "사용자가 선택하지 않은 이상 후보에서 제외"로 처리한다(engine/exercisePool.ts).
  // 샌드백, 슬레드, 로프, 메디신볼, 케이블, 스텝은 의도적으로 비워둔다.
};

// %1RM 처방은 5대 리프트 중 스쿼트·데드리프트·숄더프레스에만 적용한다. 클린·스내치는
// MD 4장 원칙 7("반복 수보다 성공률·속도·자세 우선")에 따라 %1RM을 쓰지 않고 DB의 기본
// 처방(품질회 등)을 그대로 사용한다 — 원 설계 문서의 "clean/snatch 처방 로직 미정" 항목을
// "적용 안 함"으로 확정한 것.
export const FAMILY_TO_ONE_RM_LIFT: Record<string, "squat" | "deadlift" | "press"> = {
  스쿼트: "squat",
  힌지: "deadlift",
  "수직 밀기": "press",
};

// [week1, week2, week3, deload] — %1RM. ACSM 2~3세트/RIR1~4, StrongLifts 선형 진행 원칙을
// 참고해 만든 제품 잠정값이다(코치 검수 전, README 참고).
export const LOAD_TABLE_BY_FAMILY: Record<string, [number, number, number, number]> = {
  squat: [0.7, 0.75, 0.8, 0.55],
  deadlift: [0.65, 0.72, 0.78, 0.5],
  press: [0.65, 0.7, 0.75, 0.5],
};

// 기술 게이트(MD 원칙 3: Mechanics → Consistency → Intensity). skillComplexity>=3인 운동은
// 해당 기술 체크를 통과한 사용자에게만 후보로 노출한다.
export const FAMILY_PREFIX_TO_CAPABILITY_GROUP: [prefix: string, group: string][] = [
  ["올림픽-스내치", "oly_snatch"],
  ["올림픽-클린", "oly_clean_jerk"],
  ["올림픽-저크", "oly_clean_jerk"],
  ["올림픽-풀", "oly_clean_jerk"],
  ["올림픽-복합", "oly_clean_jerk"],
  ["인버전", "pullup_inversion"],
  ["수직 당기기", "pullup_inversion"],
];
