import { readFileSync } from "node:fs";
import { join } from "node:path";

// Node용 xlsx 파서 두 가지를 모두 검토했다:
//  - 'xlsx'(SheetJS): 프로토타입 오염·ReDoS 고위험 취약점이 있고 npm에서 수정판이 없음
//  - 'exceljs': 이 워크북(openpyxl로 생성, docProps 없음)의 workbook.xml 파싱에서
//    'Cannot read properties of undefined (reading sheets)' 오류로 실패
// 대신 scripts/convert_xlsx_to_json.py(openpyxl, 신뢰할 수 있는 변환)로 미리 만든
// data/knowledge_base.json을 읽는다. xlsx 원본이 바뀌면 그 스크립트를 다시 실행해야 한다.
const JSON_PATH = join(import.meta.dirname, "..", "..", "data", "knowledge_base.json");

type KnowledgeBaseJson = Record<string, unknown[][]>;

let cached: KnowledgeBaseJson | null = null;

function load(): KnowledgeBaseJson {
  if (!cached) {
    cached = JSON.parse(readFileSync(JSON_PATH, "utf-8")) as KnowledgeBaseJson;
  }
  return cached;
}

/**
 * dataStartRow1Based는 xlsx 레이아웃(row5부터 데이터)과의 호환을 위해 남겨둔 파라미터다.
 * data/knowledge_base.json은 이미 row5부터의 데이터만 담고 있으므로 기본값(5) 외의 값은
 * 지원하지 않는다.
 */
export async function getDataRows(sheetName: string, dataStartRow1Based = 5): Promise<unknown[][]> {
  if (dataStartRow1Based !== 5) {
    throw new Error("data/knowledge_base.json은 row5부터의 데이터만 포함한다");
  }
  const kb = load();
  const rows = kb[sheetName];
  if (!rows) {
    throw new Error(`시트를 찾을 수 없음: ${sheetName} (data/knowledge_base.json 재생성 필요할 수 있음)`);
  }
  return rows;
}
