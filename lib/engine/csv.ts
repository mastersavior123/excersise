/** 최소 CSV 인코더. 콤마·따옴표·개행이 포함된 값만 따옴표로 감싸고 내부 따옴표를 이스케이프한다. */
export function toCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsvRow(values: (string | number | boolean | null | undefined)[]): string {
  return values.map(toCsvField).join(",");
}

export function buildCsv(header: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 앞에 붙인다.
  const bom = "﻿";
  return bom + [toCsvRow(header), ...rows.map(toCsvRow)].join("\r\n") + "\r\n";
}
