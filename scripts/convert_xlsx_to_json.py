#!/usr/bin/env python3
"""xlsx → JSON 1회성 변환 스크립트.

Node의 xlsx 파서(SheetJS: 미해결 고위험 취약점, exceljs: 이 워크북의 workbook.xml을
파싱하지 못하는 버그)를 둘 다 피하기 위해, openpyxl로 한 번 변환한 JSON을 저장소에
커밋해두고 시딩은 그 JSON만 읽는다. xlsx 원본이 갱신되면 이 스크립트를 다시 실행해야 한다.

사용법: python3 scripts/convert_xlsx_to_json.py
"""
import json
from datetime import date, datetime
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
XLSX_PATH = ROOT / "data" / "crossfit_programming_knowledge_base.xlsx"
JSON_PATH = ROOT / "data" / "knowledge_base.json"

# 모든 지식베이스 시트는 title(row1)/subtitle(row2)/blank(row3)/header(row4)/data(row5~) 레이아웃을 공유한다.
DATA_START_ROW = 5

SHEETS = [
    "Exercise_DB",
    "Level_Profiles",
    "Volume_Rules",
    "Session_Templates",
    "Generator_Rules",
    "Scaling_Map",
    "Enums",
    "Open_Workouts",
    "Open_Movement_Index",
    "Official_Videos",
]


def normalize_cell(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def main() -> None:
    wb = openpyxl.load_workbook(XLSX_PATH, read_only=True, data_only=True)
    output: dict[str, list[list[object]]] = {}

    for sheet_name in SHEETS:
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(min_row=DATA_START_ROW, values_only=True))
        while rows and all(v is None for v in rows[-1]):
            rows.pop()
        output[sheet_name] = [[normalize_cell(v) for v in row] for row in rows]
        print(f"{sheet_name}: {len(rows)} data rows")

    JSON_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nwrote {JSON_PATH}")


if __name__ == "__main__":
    main()
