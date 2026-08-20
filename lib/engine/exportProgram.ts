import type { Prisma } from "@prisma/client";
import type { Prescription } from "./prescribe";
import { formatPrescription } from "./format";
import { buildCsv } from "./csv";

export const PROGRAM_EXPORT_INCLUDE = {
  weeks: {
    orderBy: { weekIndex: "asc" },
    include: {
      ledgers: true,
      days: {
        orderBy: { date: "asc" },
        include: {
          log: true,
          blocks: { orderBy: { orderIndex: "asc" }, include: { exercise: true } },
        },
      },
    },
  },
  adjustmentEvents: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.ProgramInclude;

export type ProgramExportData = Prisma.ProgramGetPayload<{ include: typeof PROGRAM_EXPORT_INCLUDE }>;

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 코치가 한 달 전체를 스프레드시트로 훑어볼 수 있도록 세션 블록 단위로 한 행씩 만든다.
 * 완료 로그(RPE·통증·의욕)를 그 날의 모든 블록 행에 반복해 넣는다 — 정규화된 형태는 아니지만
 * CSV를 열어서 필터링/정렬하는 용도에는 이 편이 더 쓰기 쉽다.
 */
export function buildProgramExportCsv(program: ProgramExportData): string {
  const header = [
    "Week",
    "디로드",
    "날짜",
    "DayType",
    "슬롯",
    "ExerciseID",
    "한글명",
    "English",
    "처방",
    "SetsMin",
    "SetsMax",
    "RepsMin",
    "RepsMax",
    "LoadKg",
    "Percent1RM",
    "자동조정",
    "세션완료",
    "RPE",
    "통증",
    "의욕",
    "수면시간",
    "메모",
  ];

  const rows: (string | number | boolean | null)[][] = [];
  for (const week of program.weeks) {
    for (const day of week.days) {
      const log = day.log;
      for (const block of day.blocks) {
        const p = block.prescription as unknown as Prescription;
        rows.push([
          week.weekIndex,
          week.isDeload ? "Y" : "N",
          dateKey(day.date),
          day.dayType,
          block.slot,
          block.exercise.exerciseId,
          block.exercise.nameKo,
          block.exercise.nameEn,
          formatPrescription(p),
          p.setsMin ?? null,
          p.setsMax ?? null,
          p.repsMin ?? null,
          p.repsMax ?? null,
          p.loadKg ?? null,
          p.percent1RM !== undefined ? Math.round(p.percent1RM * 100) : null,
          p.adjustedBy && p.adjustedBy.length > 0 ? p.adjustedBy.join("|") : "",
          log?.completed ? "Y" : "N",
          log?.rpe ?? null,
          log?.pain ?? null,
          log?.motivation ?? null,
          log?.sleepHours ? Number(log.sleepHours) : null,
          log?.notes ?? "",
        ]);
      }
    }
  }

  return buildCsv(header, rows);
}

export function buildProgramExportJson(program: ProgramExportData): object {
  return {
    exportedAt: new Date().toISOString(),
    program: {
      id: program.id,
      level: program.level,
      frequency: program.frequency,
      startDate: dateKey(program.startDate),
      priorityGoals: program.priorityGoals,
      status: program.status,
      createdAt: program.createdAt.toISOString(),
    },
    weeks: program.weeks.map((week) => ({
      weekIndex: week.weekIndex,
      isDeload: week.isDeload,
      loadMultiplier: Number(week.loadMultiplier),
      ledgers: week.ledgers.map((l) => ({
        ledgerId: l.ledgerId,
        plannedValue: Number(l.plannedValue),
        minValue: Number(l.minValue),
        maxValue: Number(l.maxValue),
        withinRange: l.withinRange,
      })),
      days: week.days.map((day) => ({
        date: dateKey(day.date),
        dayType: day.dayType,
        templateId: day.templateId,
        log: day.log
          ? {
              completed: day.log.completed,
              rpe: day.log.rpe,
              pain: day.log.pain,
              motivation: day.log.motivation,
              sleepHours: day.log.sleepHours ? Number(day.log.sleepHours) : null,
              actualDurationMinutes: day.log.actualDurationMinutes,
              notes: day.log.notes,
            }
          : null,
        blocks: day.blocks.map((block) => ({
          slot: block.slot,
          exerciseId: block.exercise.exerciseId,
          nameKo: block.exercise.nameKo,
          nameEn: block.exercise.nameEn,
          prescription: block.prescription,
        })),
      })),
    })),
    adjustmentEvents: program.adjustmentEvents.map((e) => ({
      weekId: e.programWeekId,
      triggerRule: e.triggerRule,
      actionTaken: e.actionTaken,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}
