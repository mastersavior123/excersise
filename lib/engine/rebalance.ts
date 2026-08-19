import { prisma } from "../db";
import type { Prisma } from "@prisma/client";
import type { Prescription } from "./prescribe";
import {
  chronicFatigueTriggered,
  hasWellnessOverload,
  isLoadSpiking,
  type LoadPoint,
  type WellnessInput,
} from "./feedback";

const VOLUME_SLOTS = new Set(["main_strength", "accessory", "metcon"]);

export interface AppliedAdjustment {
  triggerRule: "wellness_2of3" | "rpe_load_spike" | "chronic_fatigue";
  actionTaken: string;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayKey(): string {
  return toDateKey(new Date());
}

function scalePrescription(p: Prescription, factor: number, tag: string): Prescription {
  const adjustedBy = [...(p.adjustedBy ?? []), tag];
  const next: Prescription = { ...p, adjustedBy };
  if (p.setsMin) next.setsMin = Math.max(1, Math.round(p.setsMin * factor));
  if (p.setsMax) next.setsMax = Math.max(next.setsMin ?? 1, Math.round(p.setsMax * factor));
  if (p.loadKg) next.loadKg = Math.round((p.loadKg * factor) / 2.5) * 2.5;
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

  async applyIfUntagged(
    tx: Prisma.TransactionClient,
    blockId: number,
    factor: number,
    tag: string
  ): Promise<boolean> {
    if (this.isTagged(blockId, tag)) return false;
    const next = scalePrescription(this.get(blockId), factor, tag);
    await tx.programBlock.update({
      where: { id: blockId },
      data: { prescription: next as unknown as Prisma.InputJsonValue },
    });
    this.current.set(blockId, next);
    return true;
  }
}

/**
 * 완료 로그가 저장된 직후 호출한다. MD 7장 세 규칙을 순서대로 평가해, 아직 지나지 않은
 * (미완료) program_block의 처방을 낮추고 program_adjustment_event에 근거를 남긴다.
 * 이미 끝난 세션은 되돌려 조정하지 않는다 — "당일" 규칙조차 그 날의 로그가
 * completed=false일 때만(즉 세션 전/도중 체크인일 때만) 적용한다.
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
            include: { log: true, blocks: true },
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

  const applied: AppliedAdjustment[] = [];

  await prisma.$transaction(async (tx) => {
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
        const event: AppliedAdjustment = {
          triggerRule: "wellness_2of3",
          actionTaken: `${toDateKey(day.date)} 세션의 근력/보조/메트콘 세트를 약 35% 감량 (수면·통증·의욕 중 2개 이상 저하)`,
        };
        await tx.programAdjustmentEvent.create({
          data: { programId: program.id, programWeekId: day.programWeekId, ...event },
        });
        applied.push(event);
      }
    }

    // --- Rule B: 최근 부하 급증 → 다음 큰 날 감량 ---
    const loadPoints = (days: typeof allDays) =>
      days
        .filter((d) => d.log?.completed && d.log.rpe && d.log.actualDurationMinutes)
        .map((d): LoadPoint => ({ rpe: d.log!.rpe!, durationMinutes: d.log!.actualDurationMinutes! }));

    const recentCompleted = [...completedWithLog].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 3);
    const recentLoads = loadPoints(recentCompleted);
    const historicalLoads = loadPoints(completedWithLog);

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
          const event: AppliedAdjustment = {
            triggerRule: "rpe_load_spike",
            actionTaken: `최근 3일 세션 부하(RPE×시간)가 평소보다 30% 이상 높아 ${toDateKey(nextBigDay.date)} 큰 날의 세트를 약 30% 감량`,
          };
          await tx.programAdjustmentEvent.create({
            data: { programId: program.id, programWeekId: nextBigDay.programWeekId, ...event },
          });
          applied.push(event);
        }
      }
    }

    // --- Rule C: 최근 3일 중 2일 이상 웰니스 과부하 → 다음 주 조기 디로드 ---
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
        const event: AppliedAdjustment = {
          triggerRule: "chronic_fatigue",
          actionTaken: `최근 3일 중 2일 이상 컨디션 저하가 감지되어 Week ${nextWeek.weekIndex}를 조기 디로드로 전환(세트 약 30% 감량)`,
        };
        await tx.programAdjustmentEvent.create({
          data: { programId: program.id, programWeekId: nextWeek.id, ...event },
        });
        applied.push(event);
      }
    }
  });

  return applied;
}
