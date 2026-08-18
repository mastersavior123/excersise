import type { Prescription } from "./prescribe";

export function formatPrescription(p: Prescription): string {
  const parts: string[] = [];

  if (p.setsMin !== undefined || p.setsMax !== undefined) {
    const sets = p.setsMin === p.setsMax || p.setsMax === undefined ? `${p.setsMin}` : `${p.setsMin}~${p.setsMax}`;
    parts.push(`${sets}세트`);
  }
  if (p.repsMin !== undefined || p.repsMax !== undefined) {
    const reps = p.repsMin === p.repsMax || p.repsMax === undefined ? `${p.repsMin}` : `${p.repsMin}~${p.repsMax}`;
    parts.push(`${reps}회`);
  }

  let result = parts.length > 0 ? parts.join(" × ") : p.doseRaw;

  if (p.loadKg !== undefined && p.percent1RM !== undefined) {
    result += ` @ ${p.loadKg}kg (${Math.round(p.percent1RM * 100)}%1RM)`;
  }

  return result;
}

export const LEDGER_LABELS: Record<string, string> = {
  V01: "근력 하드세트/주",
  V02: "역도 품질반복/주",
  V03: "고강도 메트콘(분)/주",
  V04: "Zone 2 저강도(분)/주",
  V06: "고충격 접촉/주",
};

export const SLOT_LABELS: Record<string, string> = {
  warmup: "워밍업",
  skill_power: "기술/파워",
  main_strength: "주근력",
  accessory: "보조",
  metcon: "메트콘",
  conditioning: "컨디셔닝",
  cooldown: "쿨다운",
};

export const DAY_TYPE_LABELS: Record<string, string> = { big: "큰 날", small: "작은 날", mixed: "중간/혼합" };
