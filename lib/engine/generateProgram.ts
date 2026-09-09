import type { Exercise, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { LIFTS, type Lift, type MovementGroup } from "../constants";
import { equipmentSatisfied, normalizeExercise, passesCapabilityGate } from "./exercisePool";
import { prescribe, type Prescription } from "./prescribe";
import {
  computeWeeklyLedgers,
  convertOneDayToLowIntensity,
  reduceOneStrengthSet,
  regressOneHighImpactBlock,
  removeOneAccessoryBlock,
  type LedgerAdjustment,
  type LedgerDay,
  type LedgerId,
} from "./ledger";
import { conflictsWithPrevious, longestConsecutiveRun, metconMovementCount, pickComplementaryMetcon } from "./compose";
import type { SlotCode } from "./constants";

export class GenerationBlockedError extends Error {
  constructor(public reasons: string[]) {
    super(`안전 게이트에 의해 생성이 중단되었습니다: ${reasons.join(", ")}`);
    this.name = "GenerationBlockedError";
  }
}

// Generator_Rules order_index=1 (BLOCK 게이트). 나머지 캡션/주의 플래그(surgery/pregnancy/
// cardio_warning)는 대시보드 경고로만 노출하고 여기서는 막지 않는다 — lib/constants.ts 참고.
const BLOCKING_HEALTH_FLAGS = new Set(["acute_pain", "chest_pain", "fainting", "neuro_symptom"]);

const WEEKDAY_KO_TO_OFFSET: Record<string, number> = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4, 토: 5, 일: 6 };
const WEEK_COUNT = 4;
const ADJUST_GUARD = 40;

function mondayOnOrBefore(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function dayTypeCode(rawDayType: string): "big" | "small" | "mixed" {
  if (rawDayType.includes("큰")) return "big";
  if (rawDayType.includes("작은")) return "small";
  return "mixed";
}

interface PlannedBlock {
  slot: SlotCode;
  exercise: Exercise;
  prescription: Prescription;
}

interface PlannedDay {
  date: Date;
  dayType: "big" | "small" | "mixed";
  templateId: string;
  conditioningText: string | null;
  lowIntensityOverride?: boolean;
  blocks: PlannedBlock[];
}

interface PlannedWeek {
  weekIndex: 1 | 2 | 3 | 4;
  isDeload: boolean;
  days: PlannedDay[];
}

interface GenerationNote {
  weekIndex: number;
  rule: LedgerAdjustment["rule"] | "consecutive_conflict" | "consecutive_day_cap";
  action: string;
}

/**
 * MD 9장 12단계 파이프라인의 규칙 기반 구현. Phase 2 v1에서 뺐던 세 가지를 Phase 7에서 붙였다:
 *  - 메트콘은 레벨에 따라 2~3개 동작을 양식·계열·패턴이 겹치지 않게 조합한다(compose.ts).
 *  - 볼륨 장부 초과 시 4단계 조정을 각 장부에 맞게 적용한다(ledger.ts) — 무엇을 왜 줄였는지
 *    program_adjustment_event에 생성 시점 이벤트로 남긴다.
 *  - 연속 훈련일에 같은 계열/패턴/후면사슬 주근력이 오면 다른 후보로 바꾼다(9단계).
 * Level_Profiles의 연속일 상한은 템플릿 요일이 고정이라 강제하지 않고, 넘으면 경고 이벤트만 남긴다.
 */
export async function generateProgram(userId: string): Promise<string> {
  const [profile, oneRms, capabilities, activeHealthFlags, latestAssessment] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.userOneRM.findMany({ where: { userId }, orderBy: { measuredAt: "desc" } }),
    prisma.userCapability.findMany({ where: { userId } }),
    prisma.userHealthFlag.findMany({ where: { userId, active: true } }),
    prisma.userLevelAssessment.findFirst({ where: { userId }, orderBy: { assessedAt: "desc" } }),
  ]);

  const blocking = activeHealthFlags.filter((f) => BLOCKING_HEALTH_FLAGS.has(f.flagType));
  if (blocking.length > 0) {
    throw new GenerationBlockedError(blocking.map((f) => f.flagType));
  }

  if (!profile || !latestAssessment || !profile.trainingDaysPerWeek || profile.primaryGoals.length === 0) {
    throw new Error("온보딩이 완료되지 않았습니다");
  }

  const level = latestAssessment.finalLevel;
  const frequency = profile.trainingDaysPerWeek as 4 | 5;

  const oneRmByLift: Partial<Record<Lift, number>> = {};
  for (const rm of oneRms) {
    if (LIFTS.includes(rm.lift as Lift) && oneRmByLift[rm.lift as Lift] === undefined) {
      oneRmByLift[rm.lift as Lift] = Number(rm.valueKg);
    }
  }

  const capabilityMap: Partial<Record<MovementGroup, boolean>> = {};
  for (const c of capabilities) capabilityMap[c.movementGroup as MovementGroup] = c.passed;

  const [templates, levelProfile, allExercises, regressions] = await Promise.all([
    prisma.sessionTemplate.findMany({
      where: { frequency: frequency === 4 ? "4일" : "5일" },
      orderBy: { templateId: "asc" },
    }),
    prisma.levelProfile.findUnique({ where: { level } }),
    prisma.exercise.findMany(),
    prisma.exerciseRelation.findMany({
      where: { relationType: "regression", orderIndex: 0 },
      include: { targetExercise: true },
    }),
  ]);
  if (templates.length === 0) throw new Error(`${frequency}일 세션 템플릿을 찾을 수 없습니다`);

  const eligible = allExercises
    .map(normalizeExercise)
    .filter(
      ({ exercise }) =>
        exercise.minLevel <= level &&
        equipmentSatisfied(exercise, profile.equipmentAvailable) &&
        passesCapabilityGate(exercise, capabilityMap)
    );
  const eligibleIds = new Set(eligible.map((e) => e.exercise.exerciseId));
  const regressionById = new Map(regressions.map((r) => [r.exerciseId, r.targetExercise]));

  const candidatesBySlot = new Map<SlotCode, Exercise[]>();
  for (const { exercise, slots } of eligible) {
    for (const slot of slots) {
      const list = candidatesBySlot.get(slot) ?? [];
      list.push(exercise);
      candidatesBySlot.set(slot, list);
    }
  }
  for (const list of candidatesBySlot.values()) list.sort((a, b) => a.exerciseId.localeCompare(b.exerciseId));

  const cursorBySlot = new Map<SlotCode, number>();
  const lastUsedBySlot = new Map<SlotCode, string>();
  const notes: GenerationNote[] = [];

  function advance(slot: SlotCode, by = 1): number {
    const start = cursorBySlot.get(slot) ?? 0;
    cursorBySlot.set(slot, start + by);
    return start;
  }

  function pickExercise(slot: SlotCode, reject?: (e: Exercise) => boolean): { exercise: Exercise; rejected: Exercise | null } | null {
    const pool = candidatesBySlot.get(slot);
    if (!pool || pool.length === 0) return null;
    const start = advance(slot);
    let rejected: Exercise | null = null;
    for (let k = 0; k < pool.length; k++) {
      const c = pool[(start + k) % pool.length];
      if (pool.length > 1 && c.exerciseId === lastUsedBySlot.get(slot)) continue;
      if (reject?.(c)) {
        rejected ??= c;
        continue;
      }
      lastUsedBySlot.set(slot, c.exerciseId);
      return { exercise: c, rejected };
    }
    const fallback = pool[start % pool.length];
    lastUsedBySlot.set(slot, fallback.exerciseId);
    return { exercise: fallback, rejected: null };
  }

  const week1Monday = mondayOnOrBefore(new Date());
  const weeks: PlannedWeek[] = [];
  const metconCount = metconMovementCount(level);
  const metconRecency = new Map<string, number>();
  let trainingDayOrdinal = 0;

  for (let weekIndex = 1; weekIndex <= WEEK_COUNT; weekIndex++) {
    const isDeload = weekIndex === WEEK_COUNT;
    let previousDay: PlannedDay | null = null;
    const days: PlannedDay[] = [];

    for (const template of templates) {
      const offset = WEEKDAY_KO_TO_OFFSET[template.recommendedWeekday ?? ""] ?? 0;
      const date = addDays(week1Monday, (weekIndex - 1) * 7 + offset);
      const isBackToBack =
        previousDay !== null && Math.round((date.getTime() - previousDay.date.getTime()) / 86_400_000) === 1;
      // 전날(연속일)의 주근력·기술 동작. 현재 템플릿에서 주근력이 이틀 연속 오는 경우는 없지만
      // 기술 슬롯은 월·화·수 연속으로 오므로(예: 스내치 기술 → 다음날 또 스내치) 기술 슬롯까지 본다.
      const LOADING_SLOTS = new Set<SlotCode>(["main_strength", "skill_power"]);
      const previousLoading = isBackToBack
        ? previousDay!.blocks.filter((b) => LOADING_SLOTS.has(b.slot)).map((b) => b.exercise)
        : [];

      const blocks: PlannedBlock[] = [];
      let metconPlaced = false;
      for (const slotRaw of template.slotSequenceParsed) {
        const slot = slotRaw as SlotCode;

        if (slot === "metcon") {
          if (metconPlaced) continue; // 템플릿에 메트콘이 둘이면 조합 하나로 합친다
          metconPlaced = true;
          const pool = candidatesBySlot.get("metcon") ?? [];
          // 그날 주근력 계열 + 전날 주근력 계열은 메트콘에서도 피한다(후면사슬 이틀 연속 등)
          const avoid = new Set([
            ...blocks.filter((b) => b.slot === "main_strength").map((b) => b.exercise.family),
            ...(isBackToBack ? previousDay!.blocks.filter((b) => b.slot === "main_strength").map((b) => b.exercise.family) : []),
          ]);
          const combo = pickComplementaryMetcon(pool, metconCount, advance("metcon", metconCount), avoid, metconRecency);
          for (const exercise of combo) {
            metconRecency.set(exercise.exerciseId, trainingDayOrdinal);
            blocks.push({ slot, exercise, prescription: prescribe(exercise, oneRmByLift, weekIndex as 1 | 2 | 3 | 4, isDeload) });
          }
          continue;
        }

        // 전날 연속 충돌 + 같은 날 앞선 주근력/기술 블록과 같은 계열(예: 백 스쿼트 + 오버헤드 스쿼트) 회피
        const sameDayLoading = blocks.filter((b) => LOADING_SLOTS.has(b.slot)).map((b) => b.exercise);
        const reject = LOADING_SLOTS.has(slot)
          ? (e: Exercise) =>
              (previousLoading.length > 0 && conflictsWithPrevious(e, previousLoading)) ||
              sameDayLoading.some((x) => x.family === e.family)
          : undefined;
        const picked = pickExercise(slot, reject);
        if (!picked) continue; // 후보가 없는 슬롯은 건너뜀(로그성 제약, README 참고)
        if (picked.rejected) {
          const why =
            previousLoading.length > 0 && conflictsWithPrevious(picked.rejected, previousLoading)
              ? "전날과 같은 계열/패턴"
              : "같은 날 앞 블록과 같은 계열";
          notes.push({
            weekIndex,
            rule: "consecutive_conflict",
            action: `${date.toISOString().slice(0, 10)} ${slot === "main_strength" ? "주근력" : "기술"}: ${why}인 ${picked.rejected.nameKo} 대신 ${picked.exercise.nameKo} 배치`,
          });
        }
        const prescription = prescribe(picked.exercise, oneRmByLift, weekIndex as 1 | 2 | 3 | 4, isDeload);
        blocks.push({ slot, exercise: picked.exercise, prescription });
      }

      const day: PlannedDay = {
        date,
        dayType: dayTypeCode(template.dayType),
        templateId: template.templateId,
        conditioningText: template.conditioning,
        blocks,
      };
      days.push(day);
      previousDay = day;
      trainingDayOrdinal++;
    }

    if (levelProfile) {
      const cap = Number(levelProfile.consecutiveDayCap);
      const run = longestConsecutiveRun(days.map((d) => d.date));
      if (Number.isFinite(cap) && run > cap && weekIndex === 1) {
        notes.push({
          weekIndex,
          rule: "consecutive_day_cap",
          action: `주 ${frequency}일 템플릿의 연속 훈련일이 ${run}일로 Level ${level} 상한(${cap}일)을 넘는다 — 템플릿 요일이 고정이라 자동으로 바꾸지 않았다. 코치 검토 필요`,
        });
      }
    }

    weeks.push({ weekIndex: weekIndex as 1 | 2 | 3 | 4, isDeload, days });
  }

  // 볼륨 장부 계산 + 초과 시 4단계 조정
  const volumeRules = await prisma.volumeLedgerRule.findMany({ where: { level } });
  const rulesByLedger = new Map(volumeRules.map((r) => [r.ledgerId as LedgerId, r]));
  const maxOf = (id: LedgerId) => {
    const r = rulesByLedger.get(id);
    return r ? Number(r.maxValue) : Infinity;
  };

  const regressionLookup = {
    resolvedRegression: (exerciseId: string) => {
      const t = regressionById.get(exerciseId);
      return t && eligibleIds.has(t.exerciseId) ? t : null;
    },
    lowImpactSubstitute: (slot: SlotCode, exclude: Set<string>) => {
      const pool = candidatesBySlot.get(slot) ?? [];
      return pool.find((e) => e.impact !== "높음" && !exclude.has(e.exerciseId)) ?? null;
    },
  };

  const weekLedgers = weeks.map((week) => {
    // LedgerDay는 PlannedDay와 같은 객체를 가리키므로(blocks 배열 레퍼런스 공유, override 플래그도
    // 같은 객체) 조정 결과가 week.days에 그대로 반영된다.
    const ledgerInput: LedgerDay[] = week.days;
    const prescribeFor = (e: Exercise) => prescribe(e, oneRmByLift, week.weekIndex, week.isDeload);
    let totals = computeWeeklyLedgers(ledgerInput);
    let guard = 0;

    const record = (adj: LedgerAdjustment | null): boolean => {
      if (!adj) return false;
      notes.push({ weekIndex: week.weekIndex, ...adj });
      totals = computeWeeklyLedgers(ledgerInput);
      guard++;
      return true;
    };

    // V01: 보조 제거 → 세트 감소
    while (totals.V01 > maxOf("V01") && guard < ADJUST_GUARD) {
      if (record(removeOneAccessoryBlock(ledgerInput))) continue;
      if (record(reduceOneStrengthSet(ledgerInput))) continue;
      break;
    }
    // V06: 고충격 동작 회귀/대체
    while (totals.V06 > maxOf("V06") && guard < ADJUST_GUARD) {
      if (!record(regressOneHighImpactBlock(ledgerInput, regressionLookup, prescribeFor))) break;
    }
    // V03: 컨디셔닝 저강도 전환
    while (totals.V03 > maxOf("V03") && guard < ADJUST_GUARD) {
      if (!record(convertOneDayToLowIntensity(ledgerInput))) break;
    }

    return totals;
  });

  const programId = await prisma.$transaction(async (tx) => {
    const program = await tx.program.create({
      data: {
        userId,
        level,
        frequency,
        startDate: week1Monday,
        priorityGoals: profile.primaryGoals,
      },
    });

    const weekIdByIndex = new Map<number, number>();
    for (let i = 0; i < weeks.length; i++) {
      const week = weeks[i];
      const programWeek = await tx.programWeek.create({
        data: {
          programId: program.id,
          weekIndex: week.weekIndex,
          isDeload: week.isDeload,
          loadMultiplier: week.isDeload ? 0.7 : 1.0,
        },
      });
      weekIdByIndex.set(week.weekIndex, programWeek.id);

      for (const day of week.days) {
        const programDay = await tx.programDay.create({
          data: {
            programWeekId: programWeek.id,
            date: day.date,
            dayType: day.dayType,
            templateId: day.templateId,
            conditioningText: day.conditioningText,
            conditioningLowIntensity: Boolean(day.lowIntensityOverride),
          },
        });

        for (let orderIndex = 0; orderIndex < day.blocks.length; orderIndex++) {
          const block = day.blocks[orderIndex];
          await tx.programBlock.create({
            data: {
              programDayId: programDay.id,
              slot: block.slot,
              orderIndex,
              exerciseId: block.exercise.exerciseId,
              prescription: block.prescription as unknown as Prisma.InputJsonValue,
            },
          });
        }
      }

      const totals = weekLedgers[i];
      for (const [ledgerId, value] of Object.entries(totals) as [LedgerId, number][]) {
        const rule = rulesByLedger.get(ledgerId);
        if (!rule) continue; // V05는 규칙은 있지만 계산하지 않으므로 저장하지 않음
        await tx.weeklyLedger.create({
          data: {
            programWeekId: programWeek.id,
            ledgerId,
            plannedValue: value,
            minValue: rule.minValue,
            maxValue: rule.maxValue,
            withinRange: value >= Number(rule.minValue) && value <= Number(rule.maxValue),
          },
        });
      }
    }

    for (const note of notes) {
      await tx.programAdjustmentEvent.create({
        data: {
          programId: program.id,
          programWeekId: weekIdByIndex.get(note.weekIndex) ?? null,
          triggerRule: note.rule,
          actionTaken: note.action,
        },
      });
    }

    return program.id;
  });

  return programId;
}
