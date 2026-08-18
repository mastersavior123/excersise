import type { Exercise, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { LIFTS, type Lift, type MovementGroup } from "../constants";
import { equipmentSatisfied, normalizeExercise, passesCapabilityGate } from "./exercisePool";
import { prescribe, type Prescription } from "./prescribe";
import { computeWeeklyLedgers, removeOneAccessoryBlock, type LedgerDay, type LedgerId } from "./ledger";
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
  blocks: PlannedBlock[];
}

interface PlannedWeek {
  weekIndex: 1 | 2 | 3 | 4;
  isDeload: boolean;
  days: PlannedDay[];
}

/**
 * MD 9장 12단계 파이프라인의 규칙 기반 v1 구현. 범위를 좁힌 지점들:
 *  - 메트콘은 2~3개 동작 조합(원칙 5) 대신 슬롯당 운동 1개만 배치한다.
 *  - 볼륨 장부 초과 시 조정은 "보조 제거" 1단계만 구현했다(세트 감소/회귀/강도 하향은 다음 반복).
 *  - 동일 관절·그립·후면사슬 연속 부하 충돌 검사(9단계)는 아직 없다.
 * 세 가지 모두 README "Phase 2 — 축소된 범위"에 남겨뒀다.
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

  const templates = await prisma.sessionTemplate.findMany({
    where: { frequency: frequency === 4 ? "4일" : "5일" },
    orderBy: { templateId: "asc" },
  });
  if (templates.length === 0) throw new Error(`${frequency}일 세션 템플릿을 찾을 수 없습니다`);

  const allExercises = await prisma.exercise.findMany();
  const eligible = allExercises
    .map(normalizeExercise)
    .filter(
      ({ exercise }) =>
        exercise.minLevel <= level &&
        equipmentSatisfied(exercise, profile.equipmentAvailable) &&
        passesCapabilityGate(exercise, capabilityMap)
    );

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

  function pickExercise(slot: SlotCode): Exercise | null {
    const pool = candidatesBySlot.get(slot);
    if (!pool || pool.length === 0) return null;
    const start = cursorBySlot.get(slot) ?? 0;
    let chosen = pool[start % pool.length];
    if (pool.length > 1 && chosen.exerciseId === lastUsedBySlot.get(slot)) {
      chosen = pool[(start + 1) % pool.length];
      cursorBySlot.set(slot, (start + 2) % pool.length);
    } else {
      cursorBySlot.set(slot, (start + 1) % pool.length);
    }
    lastUsedBySlot.set(slot, chosen.exerciseId);
    return chosen;
  }

  const week1Monday = mondayOnOrBefore(new Date());
  const weeks: PlannedWeek[] = [];

  for (let weekIndex = 1; weekIndex <= WEEK_COUNT; weekIndex++) {
    const isDeload = weekIndex === WEEK_COUNT;
    const days: PlannedDay[] = templates.map((template) => {
      const offset = WEEKDAY_KO_TO_OFFSET[template.recommendedWeekday ?? ""] ?? 0;
      const date = addDays(week1Monday, (weekIndex - 1) * 7 + offset);

      const blocks: PlannedBlock[] = [];
      for (const slotRaw of template.slotSequenceParsed) {
        const slot = slotRaw as SlotCode;
        const exercise = pickExercise(slot);
        if (!exercise) continue; // 후보가 없는 슬롯은 건너뜀(로그성 제약, README 참고)
        const prescription = prescribe(exercise, oneRmByLift, weekIndex as 1 | 2 | 3 | 4, isDeload);
        blocks.push({ slot, exercise, prescription });
      }

      return {
        date,
        dayType: dayTypeCode(template.dayType),
        templateId: template.templateId,
        conditioningText: template.conditioning,
        blocks,
      };
    });

    weeks.push({ weekIndex: weekIndex as 1 | 2 | 3 | 4, isDeload, days });
  }

  // 볼륨 장부 계산 + V01 초과 시 1단계 조정(보조 제거)
  const volumeRules = await prisma.volumeLedgerRule.findMany({ where: { level } });
  const rulesByLedger = new Map(volumeRules.map((r) => [r.ledgerId as LedgerId, r]));

  const weekLedgers = weeks.map((week) => {
    const ledgerInput: LedgerDay[] = week.days.map((d) => ({ conditioningText: d.conditioningText, blocks: d.blocks }));
    let totals = computeWeeklyLedgers(ledgerInput);

    const v01Rule = rulesByLedger.get("V01");
    let guard = 0;
    while (v01Rule && totals.V01 > Number(v01Rule.maxValue) && guard < 20) {
      const removed = removeOneAccessoryBlock(ledgerInput);
      if (!removed) break;
      totals = computeWeeklyLedgers(ledgerInput);
      guard++;
    }
    // ledgerInput 배열 안의 day.blocks는 원본 week.days[i].blocks와 같은 배열 레퍼런스이므로
    // splice로 인한 변경이 week.days에도 이미 반영되어 있다.

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

      for (const day of week.days) {
        const programDay = await tx.programDay.create({
          data: {
            programWeekId: programWeek.id,
            date: day.date,
            dayType: day.dayType,
            templateId: day.templateId,
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

    return program.id;
  });

  return programId;
}
