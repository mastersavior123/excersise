/** xlsx 셀 값 파싱 헬퍼. 지식베이스 원문의 구분자 관례를 그대로 코드화한다:
 *  - '/' : 권장 슬롯·장비·회귀/진행 대안·Scaling_Map 등 "여러 선택지 나열"
 *  - '+' : 주 패턴처럼 "하나의 동작이 갖는 복수 속성 결합"
 *  - ',' : Open 시즌/워크아웃처럼 "이력 나열"
 *  - '|' : Open_Workouts의 canonical movements "동작 시퀀스 나열"
 */

export function asString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

export function asRequiredString(v: unknown, context: string): string {
  const s = asString(v);
  if (s === null) throw new Error(`필수 문자열 값이 비어있음: ${context}`);
  return s;
}

export function asInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function asRequiredInt(v: unknown, context: string): number {
  const n = asInt(v);
  if (n === null) throw new Error(`필수 정수 값이 비어있음: ${context}`);
  return n;
}

export function asBoolYN(v: unknown): boolean {
  const s = asString(v);
  return s === "Y";
}

function splitBy(v: unknown, delimiter: string): string[] {
  const s = asString(v);
  if (s === null) return [];
  return s
    .split(delimiter)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export const splitSlash = (v: unknown): string[] => splitBy(v, "/");
export const splitPlus = (v: unknown): string[] => splitBy(v, "+");
export const splitComma = (v: unknown): string[] => splitBy(v, ",");
export const splitPipe = (v: unknown): string[] => splitBy(v, "|");

export function splitCommaInts(v: unknown): number[] {
  return splitComma(v)
    .map((part) => Number(part))
    .filter((n) => Number.isFinite(n));
}

export interface ParsedSetsReps {
  setsMin: number | null;
  setsMax: number | null;
  repsMin: number | null;
  repsMax: number | null;
}

/**
 * '기본 용량' 원문에서 세트×회 패턴만 최선을 다해 구조화한다.
 * 지원: '3~5×6~12', '3~5×3~6 @RIR2~4', '2~4×8~16/측' 등
 * 지원하지 않음(그냥 null 반환, defaultDoseRaw는 항상 원문 보존): '20~100m', '8~25/세트' 등 세트×회가 아닌 단위
 */
export function parseSetsReps(raw: string | null): ParsedSetsReps {
  const empty: ParsedSetsReps = { setsMin: null, setsMax: null, repsMin: null, repsMax: null };
  if (!raw) return empty;

  const match = raw.match(/(\d+)(?:~(\d+))?\s*[×xX]\s*(\d+)(?:~(\d+))?/);
  if (!match) return empty;

  const [, setsMinStr, setsMaxStr, repsMinStr, repsMaxStr] = match;
  const setsMin = Number(setsMinStr);
  const setsMax = setsMaxStr ? Number(setsMaxStr) : setsMin;
  const repsMin = Number(repsMinStr);
  const repsMax = repsMaxStr ? Number(repsMaxStr) : repsMin;

  return { setsMin, setsMax, repsMin, repsMax };
}
