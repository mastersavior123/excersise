# WOD Compiler

나이·직업·신체정보·5대 리프트(스쿼트/데드리프트/숄더프레스/클린/스내치) 1RM을 입력받아
월간 크로스핏 프로그램을 자동 생성하는 앱.

- **Phase 0 (완료)**: `crossfit_programming_knowledge_base.xlsx`(13개 시트)를 정규화된
  PostgreSQL 스키마로 옮기고 데이터 자체의 빈틈을 측정.
- **Phase 1 (완료)**: 회원가입, 5단계 온보딩(기본정보·1RM·기술체크·가용자원/목표), 레벨 자동 판정.
- Phase 2(프로그램 생성 엔진)는 아직 시작하지 않았다.

## 구조

```
app/                       # Next.js App Router — 페이지 + API 라우트
  page.tsx, signup/, login/, onboarding/, dashboard/
  api/auth/{signup,login,logout}, api/onboarding/{profile,one-rm,capability,resources-goals,complete}
components/                # OnboardingWizard, AuthForm, LogoutButton (client components)
lib/                       # Next 런타임에서 쓰는 서버 로직
  db.ts, session.ts, password.ts, auth.ts, onboardingStatus.ts
  levelAssessment.ts        # 레벨 스코어링 순수 함수
  validation.ts, constants.ts
data/
  crossfit_programming_knowledge_base.xlsx   # 원본 지식베이스
  crossfit_programming_knowledge_base.md     # 원본 설계 문서
  knowledge_base.json                        # xlsx → JSON 1회 변환 결과 (아래 "왜 JSON인가" 참고)
  seed-report.json                           # 마지막 db:seed 실행이 남긴 미해결 항목 리포트
prisma/
  schema.prisma           # 지식베이스 10개 테이블(Phase 0) + 사용자 도메인 6개 테이블(Phase 1)
scripts/
  convert_xlsx_to_json.py # xlsx -> knowledge_base.json 변환 (xlsx 원본이 바뀌면 재실행)
  lib/                    # knowledge_base.json 로더, 파싱 유틸, prisma 클라이언트 (CLI 스크립트 전용)
  seed/                   # 시트별 적재 스크립트 + orchestrator(index.ts)
  validate/               # 시딩 후 DB를 다시 쿼리해 관계 정합성을 검증
```

`scripts/lib/prisma.ts`(CLI 스크립트용, 매번 새 커넥션)와 `lib/db.ts`(Next.js 런타임용,
핫 리로드 대비 전역 싱글턴)는 의도적으로 분리했다.

## 왜 xlsx를 Node에서 직접 읽지 않는가

두 가지 Node용 xlsx 파서를 모두 시도했다.

- **`xlsx`(SheetJS)**: npm에 올라온 버전에 프로토타입 오염·ReDoS 고위험 취약점이 있고 수정판이 없다.
- **`exceljs`**: 이 워크북(openpyxl로 생성, `docProps` 없음)의 `workbook.xml`을 파싱하는 과정에서
  `Cannot read properties of undefined (reading 'sheets')` 오류로 항상 실패했다.

대신 `scripts/convert_xlsx_to_json.py`(이미 정상 동작이 확인된 openpyxl)로 **한 번** JSON으로
변환해 `data/knowledge_base.json`에 커밋해두고, Node 쪽은 그 JSON만 읽는다. **xlsx 원본이
갱신되면 이 파이썬 스크립트를 다시 실행해야 한다** — Node 시딩 파이프라인은 xlsx를 직접 열지 않는다.

## 설정

```bash
npm install
cp .env.example .env   # DATABASE_URL·SESSION_SECRET을 로컬 환경에 맞게 수정

npx prisma migrate dev
npm run db:seed        # 지식베이스(Phase 0)만 채움 — 사용자 데이터는 앱에서 직접 생성
npm run db:validate

npm run dev             # http://localhost:3000
```

`db:seed`는 매번 지식베이스 테이블을 비우고 다시 채우는 멱등 스크립트다(사용자 테이블은 건드리지
않는다). 끝나면 `data/seed-report.json`에 실행 요약과 미해결 항목을 남긴다.

## Phase 1 — 회원가입 · 온보딩 · 레벨 판정

**인증**: OAuth 제공자 secret 없이도 굴러가도록 이메일/비밀번호 + 자체 서명 쿠키 세션으로
구현했다(`lib/session.ts`). bcrypt로 비밀번호를 해싱하고, `userId`+발급시각을 HMAC-SHA256으로
서명한 쿠키 하나가 세션의 전부다 — NextAuth의 Account/Session 테이블 없이 최소 구현.
서버 측 세션 무효화(강제 로그아웃 등)가 필요해지면 별도 세션 테이블로 넘어가야 한다.

**온보딩 흐름**(`/onboarding`, `components/OnboardingWizard.tsx`): 기본정보 → 5대 리프트 1RM →
기술 체크리스트(4개 그룹) → 가용자원/목표+건강 체크, 4단계로 나눠 매 단계 즉시 저장한다. 서버
컴포넌트(`app/onboarding/page.tsx`)가 기존 저장값을 읽어 클라이언트에 넘기므로 중간에 나갔다
와도 입력한 단계부터 이어진다. 마지막 단계 제출 시 `/api/onboarding/complete`가 레벨을 계산해
보여주고, 사용자가 제안값을 그대로 받아들이거나 직접 조정한 뒤 확정한다.

**레벨 자동 판정**(`lib/levelAssessment.ts`): 기술 체크 40% + 상대 1RM(백스쿼트/체중) 30% +
최근 8주 훈련 빈도 20% + 목표 난이도 10%를 합산해 Level 1~4를 제안한다. **가중치·임계값은
전부 코치 검수 전 제품 잠정값**이며, 재계산될 때마다 `user_level_assessment`에 새 이력을
남기므로 나중에 알고리즘을 바꿔도 과거 판정 근거가 사라지지 않는다.

**안전 게이트**: 건강 체크 7항목 중 급성통증/흉통/실신감/신경증상(blocking=true,
`lib/constants.ts`)에 체크하면 대시보드에 경고 배너가 뜬다. Phase 1에는 아직 프로그램 생성이
없어 MD 문서의 "생성 중단(BLOCK)"까지는 구현하지 않았고, 계정 생성 자체를 막지도 않는다 —
Phase 2에서 생성 파이프라인에 실제 BLOCK 게이트로 연결해야 한다.

## 실행 결과 (2026-08-18 기준)

```
exercise 115 · exerciseAlias 230 · exerciseRelation 39
levelProfile 4 · volumeLedgerRule 24 · sessionTemplate 9
generatorRule 30 · scalingMap 20 · enumLookup 21
openWorkout 39 · openWorkoutMovement 44 · officialMedia 19
```

`Open_Movement_Index`·`Official_Videos`는 시트에 `ExerciseID`가 직접 있어 100% 해석되지만,
`Exercise_DB.회귀/진행`과 `Scaling_Map`은 이름이 카탈로그에 없는 설명적 문구가 대부분이라
실제로 아래처럼 크게 갈린다.

## 이번 실행으로 확정된 것 — 이전 "미확정 사항" 갱신

지난 대화의 생성 엔진/스키마 설계 문서에서 "코드로 옮기기 전에 결정해야 한다"고 표시해둔 항목 중
하나가 실제 데이터를 넣어보고서야 드러났다.

> **`exercise_relation`을 엄격한 FK-투-FK 테이블로 설계한 원래 가정이 틀렸다.**
> `Exercise_DB.회귀`/`진행` 컬럼의 원문 291건('/'로 분리된 개별 옵션 기준) 중 카탈로그의
> 다른 운동(한글명/English) 이름과 정확히 일치해 `exercise_relation` 행으로 연결된 것은
> **39건(약 13%)** 뿐이다. 나머지 87%는 "박스 스쿼트", "포즈 프론트 스쿼트", "템포 굿모닝"처럼
> **카탈로그에 없는 스케일링/템포 변형을 설명하는 짧은 코칭 문구**다. `Scaling_Map`의 1차/2차
> 회귀도 마찬가지다(20건 중 원본 동작 자체가 해석된 것은 7건, 회귀 옵션이 해석된 것은 1건뿐).
>
> 결론: `exercise_relation`/`scaling_map`의 `*_exercise_id` FK는 "있으면 좋은 보강 링크"로만
> 쓰고, 스케일링 UI·엔진 로직은 항상 `regressionText`/`progressionText`/`original_text`
> 원문을 1차 소스로 삼아야 한다. 이 필드들을 스키마에 `TEXT`로 함께 저장해둔 것은 이 때문이다.

`npm run db:validate`를 실행하면 이 상태가 최신 데이터 기준으로 다시 계산되어
"이상치 N건" 형태로 출력된다 — 규칙 위반이 아니라 **원문 그대로 존중해야 할 자유 텍스트의 비율**이다.

또 하나, `Session_Templates.슬롯 순서`는 자동 분류 대신 9개 템플릿에 실제 등장하는 24개
세그먼트를 `scripts/seed/seedSessionTemplates.ts`의 `SEGMENT_TO_SLOT`에 전부 수작업으로
매핑했다(예: `짧은 기술형 인터벌` → `metcon`, 휴리스틱으로 자동 분류하면 `기술형`이라는
단어 때문에 `skill_power`로 오분류되기 쉬움). 시트가 갱신되어 새 세그먼트가 추가되면
`db:validate`가 `UNMAPPED_SEGMENT`로 표시한다.

## 아직 남은 미확정 사항 (Phase 2 생성 엔진 착수 전 결정 필요)

- **주차별 %1RM 테이블**: 지난 엔진 설계 문서의 `LOAD_TABLE_BY_FAMILY`는 여전히 제품 잠정값이며
  아직 코드로 옮기지 않았다.
- **레벨 스코어링 가중치·임계값**: Phase 1에서 `lib/levelAssessment.ts`로 구현은 했지만
  (기술 40%·상대1RM 30%·빈도 20%·목표 10%, 상대1RM 구간·레벨 컷오프 전부 임시값) 실사용자
  데이터로 검증된 적은 없다. 온보딩 마지막 화면에서 사용자가 직접 조정할 수 있게 해둔 것도
  이 불확실성 때문이다.
- **clean/snatch 처방 로직**: %1RM이 아니라 성공률/속도 기준이라는 원칙(MD 4장)을 엔진에서
  어떻게 구현할지는 아직 미정. 1RM은 입력받아 저장하지만(레벨 판정의 상대 1RM 계산에는
  스쿼트만 사용) Phase 2 처방 로직에서 클린/스내치를 어떻게 쓸지는 열려 있다.
- **서버 측 세션 무효화**: 현재 세션은 쿠키 서명만으로 검증되어 로그아웃은 클라이언트 쿠키
  삭제로 처리된다. "다른 기기에서 로그아웃" 같은 기능이 필요해지면 세션 테이블이 필요하다.

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | Next.js 개발 서버 (http://localhost:3000) |
| `npm run build` / `npm run start` | 프로덕션 빌드 / 실행 |
| `npm run prisma:migrate` | 스키마 마이그레이션 적용 |
| `npm run db:seed` | knowledge_base.json → DB 적재 (지식베이스 테이블만 초기화 후 재적재) |
| `npm run db:validate` | 적재 후 DB를 재쿼리해 관계 정합성 검증, 이상 있으면 종료 코드 1 |
| `npm run typecheck` | TypeScript 타입 검사 |
| `python3 scripts/convert_xlsx_to_json.py` | xlsx 원본이 바뀌었을 때 JSON 재생성 |

## 알려진 사항

- `npm audit`에 `prisma`의 개발 의존성인 `deepmerge-ts`(<8.0.0) 고위험 권고가 남아있다.
  `@prisma/config`가 빌드 시점에만 쓰는 전이 의존성이고, 우리가 제어하는 로컬 설정 파일만
  병합 대상이라 실제 공격 표면은 없다고 판단해 상위 fix가 나올 때까지 보류했다.
- `package.json`은 `"type": "module"`이다. Next.js(Turbopack)가 `.ts` 소스의 ESM
  import/export 문법과 `package.json`의 module format이 반드시 일치해야 해서 바꿨다 —
  CLI 스크립트(`scripts/`)에서 CommonJS 전역인 `__dirname` 대신 `import.meta.dirname`을
  쓰는 이유이기도 하다.
- `AGENTS.md`/`CLAUDE.md`는 `next dev`가 자동으로 생성·재생성한다(Next.js 16 신규 동작).
  지우면 다음 `next dev` 실행 시 다시 생기므로 커밋해서 diff를 깨끗하게 유지한다.
