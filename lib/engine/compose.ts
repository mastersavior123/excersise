import type { Exercise } from "@prisma/client";

/**
 * Phase 7 — 세션 구성 순수 함수.
 *  - 메트콘 2~3동작 조합(MD 원칙 5 "보완적 조합")
 *  - 연속 훈련일 동일 계열/패턴 충돌 검사(MD 9장 9단계)
 * DB I/O 없음. generateProgram.ts가 후보 풀과 함께 호출한다.
 */

/** 레벨별 메트콘 동작 수. 초·중급은 커플릿, 고급 이상은 트리플릿 — Level_Profiles의 "고강도 상한"이
 *  L1~2는 2, L3~4는 3~4인 것과 같은 결로 잡은 제품 잠정값(코치 검수 대상, /coach/assumptions). */
export function metconMovementCount(level: number): 2 | 3 {
  return level >= 3 ? 3 : 2;
}

function patternTokens(e: Exercise): Set<string> {
  return new Set(e.primaryPattern.map((p) => p.trim()).filter(Boolean));
}

function sharesPattern(a: Exercise, b: Exercise): boolean {
  const pa = patternTokens(a);
  for (const t of patternTokens(b)) if (pa.has(t)) return true;
  return false;
}

/**
 * "보완적"의 정의(코치 관점): 양식(체조/역도/모노)이 다르고, 계열이 다르고, 주 패턴이 겹치지 않는다.
 * 세 조건을 다 만족하는 후보가 없으면 조건을 하나씩 풀어가며(패턴 → 양식) 찾는다. 계열이 같은
 * 동작은 끝까지 피한다 — 같은 계열 둘을 메트콘에 넣는 건 코치가 가장 먼저 지적할 조합이다.
 */
export function pickComplementaryMetcon(
  pool: Exercise[],
  count: number,
  startIndex: number,
  avoidFamilies: Set<string>,
  /** exerciseId → 마지막으로 쓰인 훈련일 순번. 조건을 만족하는 후보 중 가장 오래 안 쓴 것을 고른다 —
   *  순환 커서만으로는 후보가 적은 양식(모노스트럭처럴 3개)에서 같은 동작이 매일 반복됐다. */
  recency: Map<string, number> = new Map()
): Exercise[] {
  if (pool.length === 0) return [];
  const chosen: Exercise[] = [];
  const usedIds = new Set<string>();
  const lastUsed = (e: Exercise) => recency.get(e.exerciseId) ?? -1;

  // 첫 동작: 순환 커서에서 시작해, 그날 주근력 계열과 겹치지 않는 첫 후보
  for (let k = 0; k < pool.length; k++) {
    const c = pool[(startIndex + k) % pool.length];
    if (avoidFamilies.has(c.family)) continue;
    chosen.push(c);
    usedIds.add(c.exerciseId);
    break;
  }
  if (chosen.length === 0) {
    const c = pool[startIndex % pool.length];
    chosen.push(c);
    usedIds.add(c.exerciseId);
  }

  const relaxations: ((c: Exercise) => boolean)[] = [
    (c) => chosen.every((x) => x.modality !== c.modality && x.family !== c.family && !sharesPattern(x, c)),
    (c) => chosen.every((x) => x.modality !== c.modality && x.family !== c.family),
    (c) => chosen.every((x) => x.family !== c.family && !sharesPattern(x, c)),
    (c) => chosen.every((x) => x.family !== c.family),
  ];

  while (chosen.length < count) {
    let picked: Exercise | null = null;
    for (const ok of relaxations) {
      for (let k = 0; k < pool.length; k++) {
        const c = pool[(startIndex + chosen.length + k) % pool.length];
        if (usedIds.has(c.exerciseId) || avoidFamilies.has(c.family) || !ok(c)) continue;
        if (!picked || lastUsed(c) < lastUsed(picked)) picked = c;
      }
      if (picked) break;
    }
    if (!picked) break; // 계열까지 겹치지 않는 후보가 더 없으면 그 수에서 멈춘다(억지로 채우지 않음)
    chosen.push(picked);
    usedIds.add(picked.exerciseId);
  }
  return chosen;
}

/**
 * 연속 훈련일 충돌: 같은 계열이거나 주 패턴이 하나라도 겹치면 충돌로 본다(동일 관절·후면사슬 연속
 * 부하). 힌지↔스쿼트처럼 계열은 달라도 후면사슬을 함께 쓰는 조합은 POSTERIOR_CHAIN으로 묶는다.
 */
const POSTERIOR_CHAIN = new Set(["힌지", "힌지/당기기", "올림픽-클린", "올림픽-스내치", "올림픽-풀"]);

export function conflictsWithPrevious(candidate: Exercise, previous: Exercise[]): boolean {
  for (const p of previous) {
    if (p.family === candidate.family) return true;
    if (sharesPattern(p, candidate)) return true;
    if (POSTERIOR_CHAIN.has(p.family) && POSTERIOR_CHAIN.has(candidate.family)) return true;
  }
  return false;
}

/** 훈련일 날짜 배열에서 가장 긴 연속 일수 */
export function longestConsecutiveRun(dates: Date[]): number {
  const keys = [...new Set(dates.map((d) => Math.floor(d.getTime() / 86_400_000)))].sort((a, b) => a - b);
  let best = keys.length > 0 ? 1 : 0;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    run = keys[i] === keys[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}
