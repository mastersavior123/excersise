import { prisma } from "../db";
import type { Exercise, Prisma } from "@prisma/client";
import type { Prescription } from "./prescribe";
import { FAMILY_TO_ONE_RM_LIFT } from "./constants";
import {
  chronicFatigueTriggered,
  hasWellnessOverload,
  isLoadSpiking,
  type LoadPoint,
  type WellnessInput,
} from "./feedback";

const VOLUME_SLOTS = new Set(["main_strength", "accessory", "metcon"]);
/** MD 7장 "개인 28일 중앙값" — Phase 7부터 이 사용자의 모든 프로그램에서 최근 28일 완료 세션을 모수로 쓴다 */
const BASELINE_WINDOW_DAYS = 28;
/** MD 9장 19행 "2회 연속 실패 시 5~10% 감량" — 중간값 7.5% */
export const STRENGTH_CUT_FACTOR = 0.925;

export interface AppliedAdjustment {
  triggerRule:
    | "wellness_2of3"
    | "rpe_load_spike"
    | "chronic_fatigue"
    | "strength_hold"
    | "strength_cut"
    | "skill_regress"
    | "skill_regress_recommended";
  actionTaken: string;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayKey(): string {
  return toDateKey(new Date());
}

function roundToPlate(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}

function scalePrescription(p: Prescription, factor: number, tag: string): Prescription {
  const adjustedBy = [...(p.adjustedBy ?? []), tag];
  const next: Prescription = { ...p, adjustedBy };
  if (p.setsMin) next.setsMin = Math.max(1, Math.round(p.setsMin * factor));
  if (p.setsMax) next.setsMax = Math.max(next.setsMin ?? 1, Math.round(p.setsMax * factor));
  if (p.loadKg) next.loadKg = roundToPlate(p.loadKg * factor);
  return next;
}

/**
 * 여러 규칙이 같은 블록을 건드릴 수 있어(예: Rule B의 "다음 큰 날"과 Rule C의 "다음 주"가
 * 겹치는 날), 트랜잭션 시작 시점에 한 번 읽은 스냅샷을 규칙마다 다시 읽으면 뒤에 도는 규칙이
 * 앞선 규칙의 DB 반영을 못 보고 덮어써버린다(실제로 재현해서 확인한 버그). 그래서 현재
 * prescription 상태를 이 맵에서만 읽고 쓰며, DB에도 매번 즉시 반영한다.
 */
class PrescriptionStore {
  private current = new Map<number, Prescription>();

  constructor(blocks: { id: number; prescription: unknown }[]) {
    for (const b of blocks) this.current.set(b.id, b.prescription as Prescription);
  }

  get(blockId: number): Prescription {
    return this.current.get(blockId)!;
  }

  isTagged(blockId: number, tag: string): boolean {
    return Boolean(this.get(blockId).adjustedBy?.includes(tag));
  }

  async write(tx: Prisma.TransactionClient, blockId: number, next: Prescription, exerciseId?: string) {
    await tx.programBlock.update({
      where: { id: blockId },
      data: { prescription: next as unknown as Prisma.InputJsonValue, ...(exerciseId ? { exerciseId } : {}) },
    });
    this.current.set(blockId, next);
  }

  async applyIfUntagged(tx: Prisma.TransactionClient, blockId: number, factor: number, tag: string): Promise<boolean> {
    if (this.isTagged(blockId, tag)) return false;
    await this.write(tx, blockId, scalePrescription(this.get(blockId), factor, tag));
    return true;
  }
}

/**
 * 완료 로그가 저장된 직후 호출한다. MD 7장 세 규칙(A·B·C)과 Phase 7에서 추가한 블록 결과
 * 규칙(D 근력, E 기술)을 순서대로 평가해, 아직 지나지 않은 program_block의 처방을 바꾸고
 * program_adjustment_event에 근거를 남긴다. 이미 끝난 세션은 절대 되돌려 조정하지 않는다.
 */
export async function runFeedbackLoop(programDayId: number): Promise<AppliedAdjustment[]> {
  const day = await prisma.programDay.findUnique({
    where: { id: programDayId },
    include: { programWeek: { include: { program: true } }, log: true },
  });
  if (!day || !day.log) return [];

  const program = await prisma.program.findUnique({
    where: { id: day.programWeek.programId },
    include: {
      weeks: {
        orderBy: { weekIndex: "asc" },
        include: {
          days: {
            orderBy: { date: "asc" },
            include: {
              log: true,
              blocks: { include: { result: true, exercise: { include: { relationsFrom: { where: { relationType: "regression", orderIndex: 0 }, include: { targetExercise: true } } } } } },
            },
          },
        },
      },
    },
  });
  if (!program) return [];

  const allDays = program.weeks.flatMap((w) => w.days.map((d) => ({ ...d, week: w })));
  const completedWithLog = allDays.filter((d) => d.log?.completed);
  const today = todayKey();
  const store = new PrescriptionStore(allDays.flatMap((d) => d.blocks));

  // Rule B 기준선: 이 사용자의 모든 프로그램에서 최근 28일 완료 세션 (Phase 7 — 프로그램마다 초기화되던 문제 해결)
  const windowStart = new Date(Date.now() - BASELINE_WINDOW_DAYS * 86_400_000);
  const historyDays = await prisma.programDay.findMany({
    where: {
      programWeek: { program: { userId: program.userId } },
      date: { gte: windowStart },
      log: { completed: true, rpe: { not: null }, actualDurationMinutes: { not: null } },
    },
    include: { log: true },
    orderBy: { date: "desc" },
  });
  const historicalLoads: LoadPoint[] = historyDays.map((d) => ({
    rpe: d.log!.rpe!,
    durationMinutes: d.log!.actualDurationMinutes!,
  }));
  const recentLoads = historicalLoads.slice(0, 3);

  const applied: AppliedAdjustment[] = [];

  await prisma.$transaction(async (tx) => {
    const event = async (weekId: number | null, e: AppliedAdjustment) => {
      await tx.programAdjustmentEvent.create({ data: { programId: program.id, programWeekId: weekId, ...e } });
      applied.push(e);
    };

    // --- Rule A: 당일 웰니스 과부하 → 이 날 볼륨 감량 (체크인이 completed=false일 때만) ---
    const thisLog = day.log!;
    const wellness: WellnessInput = {
      sleepHours: thisLog.sleepHours ? Number(thisLog.sleepHours) : null,
      pain: thisLog.pain,
      motivation: thisLog.motivation,
    };
    if (!thisLog.completed && hasWellnessOverload(wellness)) {
      const dayRecord = allDays.find((d) => d.id === day.id);
      const targets = dayRecord?.blocks.filter((b) => VOLUME_SLOTS.has(b.slot)) ?? [];
      let changed = false;
      for (const block of targets) {
        if (await store.applyIfUntagged(tx, block.id, 0.65, "wellness_2of3")) changed = true;
      }
      if (changed) {
        await event(day.programWeekId, {
          triggerRule: "wellness_2of3",
          actionTaken: `${toDateKey(day.date)} 세션의 근력/보조/메트콘 세트를 약 35% 감량 (수면·통증·의욕 중 2개 이상 저하)`,
        });
      }
    }

    // --- Rule B: 최근 부하 급증 → 다음 큰 날 감량 ---
    if (isLoadSpiking(recentLoads, historicalLoads)) {
      const nextBigDay = allDays
        .filter((d) => toDateKey(d.date) >= today && d.dayType === "big" && !d.log?.completed)
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

      if (nextBigDay) {
        const targets = nextBigDay.blocks.filter((b) => VOLUME_SLOTS.has(b.slot));
        let changed = false;
        for (const block of targets) {
          if (await store.applyIfUntagged(tx, block.id, 0.7, "rpe_load_spike")) changed = true;
        }
        if (changed) {
          await event(nextBigDay.programWeekId, {
            triggerRule: "rpe_load_spike",
            actionTaken: `최근 3일 세션 부하(RPE×시간)가 28일 중앙값보다 30% 이상 높아 ${toDateKey(nextBigDay.date)} 큰 날의 세트를 약 30% 감량`,
          });
        }
      }
    }

    // --- Rule C: 최근 3일 중 2일 이상 웰니스 과부하 → 다음 주 조기 디로드 ---
    const recentCompleted = [...completedWithLog].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 3);
    const recentWellness: WellnessInput[] = recentCompleted.map((d) => ({
      sleepHours: d.log!.sleepHours ? Number(d.log!.sleepHours) : null,
      pain: d.log!.pain,
      motivation: d.log!.motivation,
    }));

    if (recentCompleted.length >= 3 && chronicFatigueTriggered(recentWellness)) {
      const nextWeek = program.weeks
        .filter((w) => w.weekIndex > day.programWeek.weekIndex && !w.isDeload)
        .sort((a, b) => a.weekIndex - b.weekIndex)[0];

      if (nextWeek && !nextWeek.days.some((d) => d.log?.completed)) {
        await tx.programWeek.update({ where: { id: nextWeek.id }, data: { isDeload: true, loadMultiplier: 0.7 } });
        for (const d of nextWeek.days) {
          for (const block of d.blocks) {
            await store.applyIfUntagged(tx, block.id, 0.7, "chronic_fatigue");
          }
        }
        await event(nextWeek.id, {
          triggerRule: "chronic_fatigue",
          actionTaken: `최근 3일 중 2일 이상 컨디션 저하가 감지되어 Week ${nextWeek.weekIndex}를 조기 디로드로 전환(세트 약 30% 감량)`,
        });
      }
    }

    // --- Rule D·E: 블록 결과(성공/부분/실패) 기반 규칙 (Phase 7, MD 9장 19·20행) ---
    const thisDay = allDays.find((d) => d.id === day.id);
    if (!thisDay) return;

    // 결과가 기록된 이 프로그램의 블록을 날짜순으로 — "연속 실패"는 같은 리프트/운동의 최근 두 결과가 모두 failed
    const loggedBlocks = allDays
      .flatMap((d) => d.blocks.filter((b) => b.result).map((b) => ({ ...b, date: d.date })))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    // "이후 세션" = 이 세션보다 뒤 날짜이면서 아직 완료되지 않은 것(늦게 기록해도 이 세션 자신은 제외)
    const futureBlocks = allDays
      .filter((d) => d.date.getTime() > thisDay.date.getTime() && !d.log?.completed)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .flatMap((d) => d.blocks.map((b) => ({ ...b, date: d.date, weekId: d.programWeekId })));

    const liftOf = (e: Exercise) => FAMILY_TO_ONE_RM_LIFT[e.family];
    const lastTwo = <T>(arr: T[]) => arr.slice(-2);

    // Rule D: 주근력(%1RM 계열) 실패
    for (const block of thisDay.blocks) {
      if (block.slot !== "main_strength" || block.result?.outcome !== "failed") continue;
      const lift = liftOf(block.exercise);
      const current = store.get(block.id);
      if (!lift || !current.loadKg) continue;

      const history = loggedBlocks.filter((b) => b.slot === "main_strength" && liftOf(b.exercise) === lift);
      const consecutiveFail = lastTwo(history).length === 2 && lastTwo(history).every((b) => b.result!.outcome === "failed");
      const targets = futureBlocks.filter((b) => b.slot === "main_strength" && liftOf(b.exercise) === lift);
      if (targets.length === 0) continue;

      if (consecutiveFail) {
        let n = 0;
        for (const t of targets) {
          if (store.isTagged(t.id, "strength_cut")) continue;
          const p = store.get(t.id);
          const next: Prescription = { ...p, adjustedBy: [...(p.adjustedBy ?? []), "strength_cut"] };
          if (p.loadKg) next.loadKg = roundToPlate(p.loadKg * STRENGTH_CUT_FACTOR);
          if (p.percent1RM) next.percent1RM = Math.round(p.percent1RM * STRENGTH_CUT_FACTOR * 1000) / 1000;
          await store.write(tx, t.id, next);
          n++;
        }
        if (n > 0) {
          await event(thisDay.programWeekId, {
            triggerRule: "strength_cut",
            actionTaken: `${block.exercise.nameKo} 계열 2회 연속 실패 → 남은 ${n}개 주근력 블록 중량 7.5% 감량`,
          });
        }
      } else {
        const t = targets[0];
        if (store.isTagged(t.id, "strength_hold")) continue;
        const p = store.get(t.id);
        const next: Prescription = {
          ...p,
          loadKg: current.loadKg,
          percent1RM: current.percent1RM,
          adjustedBy: [...(p.adjustedBy ?? []), "strength_hold"],
        };
        await store.write(tx, t.id, next);
        await event(t.weekId, {
          triggerRule: "strength_hold",
          actionTaken: `${block.exercise.nameKo} 실패 → ${toDateKey(t.date)} ${t.exercise.nameKo} 중량을 ${current.loadKg}kg으로 유지(증량 보류)`,
        });
      }
    }

    // Rule E: 기술/파워 블록 2회 연속 실패 → 회귀 운동으로 교체(해석된 회귀가 있을 때) / 없으면 권장 표시
    for (const block of thisDay.blocks) {
      if (block.slot !== "skill_power" || block.result?.outcome !== "failed") continue;
      const history = loggedBlocks.filter((b) => b.slot === "skill_power" && b.exerciseId === block.exerciseId);
      const two = lastTwo(history);
      if (two.length < 2 || !two.every((b) => b.result!.outcome === "failed")) continue;

      const targets = futureBlocks.filter((b) => b.slot === "skill_power" && b.exerciseId === block.exerciseId);
      if (targets.length === 0) continue;
      const regression = block.exercise.relationsFrom[0]?.targetExercise ?? null;

      let n = 0;
      for (const t of targets) {
        const tag = regression ? "skill_regress" : "skill_regress_recommended";
        if (store.isTagged(t.id, tag)) continue;
        const p = store.get(t.id);
        if (regression) {
          const next: Prescription = {
            doseRaw: regression.defaultDoseRaw,
            setsMin: regression.defaultDoseSetsMin ?? undefined,
            setsMax: regression.defaultDoseSetsMax ?? undefined,
            repsMin: regression.defaultDoseRepsMin ?? undefined,
            repsMax: regression.defaultDoseRepsMax ?? undefined,
            adjustedBy: [...(p.adjustedBy ?? []), tag],
          };
          await store.write(tx, t.id, next, regression.exerciseId);
        } else {
          await store.write(tx, t.id, { ...p, adjustedBy: [...(p.adjustedBy ?? []), tag] });
        }
        n++;
      }
      if (n > 0) {
        await event(thisDay.programWeekId, {
          triggerRule: regression ? "skill_regress" : "skill_regress_recommended",
          actionTaken: regression
            ? `${block.exercise.nameKo} 2회 연속 실패 → 남은 ${n}개 기술 블록을 회귀 운동 ${regression.nameKo}로 교체`
            : `${block.exercise.nameKo} 2회 연속 실패 → 회귀 운동이 카탈로그에 해석되지 않아 남은 ${n}개 블록에 "회귀 권장"(원문: ${block.exercise.regressionText ?? "없음"}) 표시`,
        });
      }
    }
  });

  return applied;
}
