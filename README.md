# WOD Compiler

나이·직업·신체정보·5대 리프트(스쿼트/데드리프트/숄더프레스/클린/스내치) 1RM을 입력받아
월간 크로스핏 프로그램을 자동 생성하는 앱.

- **Phase 0 (완료)**: `crossfit_programming_knowledge_base.xlsx`(13개 시트)를 정규화된
  PostgreSQL 스키마로 옮기고 데이터 자체의 빈틈을 측정.
- **Phase 1 (완료)**: 회원가입, 5단계 온보딩(기본정보·1RM·기술체크·가용자원/목표), 레벨 자동 판정.
- **Phase 2 (완료, 범위 축소된 v1)**: 4주 프로그램 생성 엔진 — 안전 게이트 → 세션 스켈레톤 선택 →
  일별 슬롯 배치 → 1RM 기반 처방 → 볼륨 장부 계산/조정 → 저장 → 조회.
- **Phase 3 (완료)**: 월간 캘린더 뷰, 세션 상세(스케일링 정보·동작 영상 링크), 완료 로그(RPE/통증/수면/메모).
- **Phase 4 (완료, 범위 축소된 v1)**: 피드백 루프 — 완료 로그 저장 시 MD 7장 세 규칙(당일 웰니스
  감량·부하 급증 감량·조기 디로드)을 자동 평가해 아직 지나지 않은 세션의 처방을 낮추고
  근거를 남긴다.
- Phase 5(코치 검수 도구·오픈 워크아웃 벤치마크·모바일 등)는 아직 시작하지 않았다.

## 구조

```
app/                       # Next.js App Router — 페이지 + API 라우트
  page.tsx, signup/, login/, onboarding/, dashboard/
  program/[id]/              # 월간 캘린더
  program/[id]/day/[dayId]/  # 세션 상세 + 완료 로그
  api/auth/{signup,login,logout}
  api/onboarding/{profile,one-rm,capability,resources-goals,complete}
  api/program/generate
  api/program/day/[dayId]/log
components/                # OnboardingWizard, AuthForm, LogoutButton, ProgramGenerateButton, TrainingLogForm
lib/                       # Next 런타임에서 쓰는 서버 로직
  db.ts, session.ts, password.ts, auth.ts, onboardingStatus.ts
  levelAssessment.ts        # 레벨 스코어링 순수 함수
  validation.ts, constants.ts
  engine/                   # 생성 엔진 (모두 순수 함수 + generateProgram.ts/rebalance.ts만 DB I/O)
    constants.ts             # 슬롯/장비 어휘 정규화 매핑, %1RM 테이블, 기술 게이트 규칙
    exercisePool.ts          # 슬롯 정규화, 장비 충족 여부, 기술 게이트
    prescribe.ts             # 1RM 기반 %부하 계산 + 기본 처방
    ledger.ts                # 주간 볼륨 장부 계산 + V01 초과 시 조정
    generateProgram.ts       # Phase 2: 파이프라인 오케스트레이터 (안전 게이트 → ... → DB 저장)
    format.ts                 # 조회 페이지용 표시 포맷터
    feedback.ts               # Phase 4: MD 7장 세 규칙의 순수 판정 함수
    rebalance.ts               # Phase 4: 로그 저장 후 규칙을 적용해 미래 블록을 갱신하는 오케스트레이터
data/
  crossfit_programming_knowledge_base.xlsx   # 원본 지식베이스
  crossfit_programming_knowledge_base.md     # 원본 설계 문서
  knowledge_base.json                        # xlsx → JSON 1회 변환 결과 (아래 "왜 JSON인가" 참고)
  seed-report.json                           # 마지막 db:seed 실행이 남긴 미해결 항목 리포트
prisma/
  schema.prisma           # 지식베이스 10개(Phase 0) + 사용자 도메인 6개(Phase 1) + 프로그램 5개(Phase 2)
                           # + 완료 로그 1개(Phase 3) + 조정 이력 1개(Phase 4) 테이블
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
`lib/constants.ts`)에 체크하면 대시보드에 경고 배너가 뜬다. Phase 1 시점에는 계정 생성 자체를
막지 않는 안내 배너였지만, Phase 2에서 이 4개 플래그가 활성화되어 있으면
`generateProgram()`이 `GenerationBlockedError`를 던져 프로그램 생성 자체를 막도록 연결했다
(MD Generator_Rules 1행 그대로 구현).

## Phase 2 — 프로그램 생성 엔진 v1

MD 9장 12단계 파이프라인을 규칙 기반으로 구현했다(`lib/engine/generateProgram.ts`). 순서:
안전 게이트(BLOCK) → 세션 스켈레톤 선택(4일/5일) → 4주×N일 날짜 배정 → 슬롯별 후보 필터링
(레벨/장비/기술 게이트) → 순환 선택으로 운동 배정 → 1RM 기반 처방 → 볼륨 장부 계산 →
V01 초과 시 조정 → DB 저장. 대시보드에서 "4주 프로그램 생성" 버튼 → `/program/[id]`에서 확인.

**어휘 정규화가 다시 문제였다**(Phase 0의 회귀/진행 발견과 같은 패턴). `exercise.recommended_slots`·
`exercise.equipment`는 xlsx 원문을 '/'로만 쪼갠 자유 텍스트라, `session_template.slot_sequence_parsed`
(Phase 0에서 만든 영문 코드)나 온보딩의 8개 장비 카테고리와 어휘가 달랐다. 실제 DB에 나온 값을
전수 조사해(`SELECT ... GROUP BY`) `lib/engine/constants.ts`에 수작업 매핑표를 만들었다:

- 슬롯 13개 토큰(기술/파워/학습/근력/주근력/보조/보조근력/메트콘/컨디셔닝/워밍업/회복 + 오탈자로
  보이는 "주"·"회귀" 2개) → 7개 슬롯 코드.
- 장비는 39가지 조합, 개별 토큰 기준 매트/바닥/벽처럼 "어디에나 있다고 가정"하는 것과, 온보딩
  8개 카테고리로 매핑되는 것, 그리고 **샌드백·슬레드·로프·메디신볼·케이블·스텝처럼 대응 카테고리가
  아예 없는 것**으로 나눴다 — 마지막 그룹은 온보딩에 옵션을 추가하기 전까지 항상 후보에서 제외된다.

**5대 리프트 중 %1RM을 쓰는 건 3개뿐이다.** `family`가 41가지로 매우 세분화되어 있는데,
스쿼트(`스쿼트`)·데드리프트(`힌지`)·숄더프레스(`수직 밀기`) 3개 계열만 %1RM으로 처방하고,
클린·스내치는 MD 원칙 7("반복 수보다 성공률·속도 우선")을 그대로 따라 %1RM을 아예 쓰지 않고
Exercise_DB의 기본 처방(품질회 등)을 그대로 쓴다 — Phase 1 README에 "미정"으로 남겼던 항목을
이번에 "적용 안 함"으로 확정했다.

**Phase 0의 `default_dose_sets_min` 파싱 버그를 발견해 고쳤다.** 처음엔 `dose_unit==='세트×회'`
일 때만 세트×회를 파싱했는데, `품질회` 단위도 `'4~6×2~5'`처럼 같은 패턴을 쓰는 경우가 많았다.
단위와 무관하게 항상 파싱을 시도하도록 `scripts/seed/seedExercise.ts`를 고치고 재시딩하니
`품질회` 20건 모두 파싱됐다(전에는 0건) — 이 값이 없으면 V02(역도 품질반복) 장부를 계산할 수 없었다.

**실제로 생성해서 확인한 볼륨 장부 결과** (Level 3, 주 4일 사용자 예시): V01 근력 하드세트
15.0/8~16(정상), V03 고강도 메트콘 42.5분/35~60(정상)은 범위 안에 들어왔지만, **V02 역도
품질반복 30.0/80~150, V04 Zone2 27.5/40~90은 범위 미달로 나왔다** — 슬롯당 운동을 1개만 배치하는
이번 v1의 단순화 때문일 가능성이 크다(아래 "축소된 범위" 참고). 이 미달은 버그가 아니라 정직하게
계산된 결과이고, `program/[id]` 페이지에 "범위 밖"으로 그대로 표시된다.

세 가지 프로필(장비·기술 다양·풍부한 Level 3 사용자 / 안전 플래그로 차단되는 사용자 / 맨몸+Level 1
+기술 전부 미통과인 최소 사용자)로 실제 생성해 날짜 계산(월요일 기준 요일 오프셋), %1RM 처방,
안전 게이트, 장비/기술 필터가 모두 의도대로 동작하는 걸 확인했다.

### Phase 2 — 의도적으로 축소한 범위

- **메트콘은 슬롯당 운동 1개**다. MD 원칙 5("2~3개 동작의 보완적 조합")를 구현하지 않았다 —
  동작 간 관절/패턴 충돌을 피해 조합을 짜는 로직은 다음 반복 과제.
- **볼륨 장부 조정은 "보조 제거" 1단계만** 구현했다(MD 9장 10단계는 보조 제거→세트 감소→
  운동 회귀→저강도 전환 4단계). V01이 넘칠 때만 동작하고, 세트 감소·회귀·저강도 전환은 없다.
- **동일 관절/그립/후면사슬 연속 부하 충돌 검사(9단계)가 없다.** 연속 큰 날 배치를 막는 로직도
  없다 — 세션 템플릿의 Big/Little 순서(예: T5의 Big-Little-Big-Little-Big)에 이미 어느 정도
  반영되어 있다는 가정에 기대고 있을 뿐, 코드로 재검증하지는 않는다.
- **V05(체조 기술연습 분)는 계산하지 않는다.** 세션 템플릿에 슬롯별 시간이 아니라 컨디셔닝
  총 시간만 있어서, 지어내지 않고 그냥 뺐다.
- **재시딩(`db:seed`)은 프로그램이 있으면 실패할 수 있다.** `program_block.exercise_id`가
  `exercise`를 참조하는데 `db:seed`는 `exercise` 테이블을 통째로 비우고 다시 채운다 — 지금은
  실제 프로그램이 쌓이기 전이라 문제없지만, Phase 3 이후에는 시딩 전략을 다시 봐야 한다.

## Phase 3 — 월간 캘린더 · 세션 상세 · 완료 로그

`/program/[id]`를 표 나열에서 진짜 캘린더로 바꿨다. `program.start_date`가 항상 월요일이라는
Phase 2의 불변식(`mondayOnOrBefore`) 덕분에, 각 주를 월~일 7열 그리드로 그리고 훈련일이 없는
칸은 점선 테두리의 "휴식"으로 표시하면 실제 달력처럼 맞아떨어진다. 날짜를 누르면
`/program/[id]/day/[dayId]`(세션 상세)로 이동한다.

**세션 상세의 스케일링 정보는 Phase 0의 발견을 그대로 반영했다.** 각 운동 카드는 항상
`exercise.regression_text` 원문(예: "PVC OHS/프론트 스쿼트")을 먼저 보여주고, 그중
`exercise_relation`으로 실제 해석된 것(카탈로그 전체의 13%만 해당, README 위쪽 참고)이 있으면
운동 이름을 볼드로 덧붙이면서 "처방은 재계산되지 않은 참고용"이라고 명시한다. 원문보다 앞서
있는 것처럼 보이게 하지 않는다 — 해석 안 된 나머지 87%도 원문 그대로는 항상 보인다.
동작 영상(`official_youtube_url`)·CrossFit Movements 링크(`crossfit_movements_url`)가 있으면
같이 노출한다(Phase 0에서 채운 필드를 처음으로 실제 화면에 쓴 것).

**완료 로그**(`training_log`, program_day 1:1)는 완료 여부·RPE(1~10)·통증(0~10)·수면시간·메모를
기록한다. 소유권 검증은 `programDay → programWeek → program.userId`를 조인해서 확인하고,
다른 사용자가 남의 세션 상세나 로그 API에 접근하면 404를 준다(실제로 두 번째 계정으로 재현해서
확인함 — 200이 아니라 404인 이유는 "존재를 숨기는" 편이 "권한 없음"보다 정보 노출이 적어서다).
Phase 3 시점에는 로그 값이 어디에도 반영되지 않았다 — Phase 4에서 이어진다.

세 단계(회원가입 → 온보딩 → 생성)를 거친 실제 사용자로 캘린더 렌더링(큰 날 8·작은 날 4·중간 날
4·휴식 12칸, 4주×7일=28칸 정확히 일치), 세션 상세의 %1RM 처방·영상 링크·회귀 표시, 완료 로그
저장→재조회 시 폼에 값이 그대로 채워지는 것, 캘린더에 "✓ 완료" 표시가 뜨는 것까지 확인했다.

## Phase 4 — 피드백 루프

완료 로그 저장(`POST /api/program/day/[dayId]/log`) 직후 `lib/engine/rebalance.ts`가 MD 7장의
세 규칙을 순서대로 평가한다. 이미 끝난 세션은 절대 되돌려 조정하지 않는다 — "당일" 규칙조차
그 날의 로그가 `completed=false`일 때만(즉 세션 전/도중 체크인일 때만) 적용된다.

1. **당일 웰니스 과부하** (`wellness_2of3`): 수면≤5h·통증≥6/10·의욕≤3/10 중 2개 이상이면 그 날
   세션의 근력/보조/메트콘 세트를 약 35% 줄인다.
2. **부하 급증** (`rpe_load_spike`): 완료된 세션의 RPE×실제시간(분)을 "부하"로 보고, 최근 3일
   평균이 기준선(중앙값)보다 30% 이상 높으면 다음으로 예정된 큰 날의 세트를 약 30% 줄인다.
   원 설계 문서는 "개인 28일 중앙값"을 기준선으로 삼지만, 프로그램이 4주(28일)짜리라 시작
   시점엔 그만한 이력이 없다 — 그래서 "이 프로그램에서 지금까지 완료한 세션"을 모수로 쓰고,
   최소 3건이 쌓이기 전에는 판정을 보류한다.
3. **만성 피로 → 조기 디로드** (`chronic_fatigue`): 완료된 최근 3일 중 2일 이상에서 규칙 1의
   웰니스 과부하가 감지되면, 아직 시작하지 않은 다음 주 전체를 디로드로 전환한다
   (`is_deload=true`, 세트 약 30% 감량).

의욕(`motivation`)과 실제 소요 시간(`actual_duration_minutes`)은 Phase 3에는 없던 필드다 —
MD 7장 규칙이 요구하는데 빠져 있어서 Phase 4에서 `training_log`에 추가했다. RPE·통증만으로는
규칙 1을 절반만 구현하는 셈이라, 필드가 없다고 규칙을 느슨하게 바꾸는 대신 데이터를 추가하는
쪽을 택했다.

**실제로 재현해서 잡은 버그 하나**: 세 규칙이 같은 세션 블록을 동시에 건드릴 수 있다(예: 부하
급증 규칙의 "다음 큰 날"과 조기 디로드 규칙의 "다음 주"가 같은 날을 가리키는 경우). 처음
구현에서는 각 규칙이 트랜잭션 시작 시점에 한 번 읽은 프리즈마 객체를 그대로 참조해서, 나중에
도는 규칙이 앞선 규칙의 DB 반영을 못 보고 덮어썼다 — 태그 배열이 `["rpe_load_spike",
"chronic_fatigue"]`가 아니라 `["chronic_fatigue"]`만 남고, 세트 수도 0.7×0.7=0.49가 아니라
0.7 한 번만 적용된 값으로 조용히 되돌아갔다. 실제로 두 규칙이 겹치는 시나리오를 만들어
재현했고, 트랜잭션 안에서 블록별 현재 처방을 추적하는 `PrescriptionStore`로 고쳐 두 태그가
모두 남고 0.7×0.7=0.49배로 정확히 곱해지는 것까지 다시 확인했다.

세 규칙을 각각(그리고 규칙 2·3이 겹치는 경우까지) 실제 로그 시퀀스로 재현해 확인했다: 체크인
로그 1건으로 규칙 1이 즉시 발동하는 것, 완료 로그 4건(평이한 부하 2건 + 웰니스 나쁜 날 1건 +
마지막에 부하 급증이면서 웰니스도 나쁜 날 1건)으로 규칙 2·3이 동시에 발동하며 겹치는 블록에
두 태그가 모두 쌓이는 것, 캘린더 페이지의 "자동 보정 이력"과 세션 상세의 "자동 조정됨" 배지에
반영되는 것까지 확인했다. `npm run build` 프로덕션 빌드도 통과.

### Phase 4 — 의도적으로 축소한 범위

- **기술 실패 종료 규칙**(MD 9장 20행 "2회 연속 기술 실패 시 종료/회귀")은 세션 진행 중
  실시간 판단이 필요해서 완료 후 로그 기반인 지금 구조로는 자연스럽게 구현하기 어렵다 — 뺐다.
- **근력 증량/실패 규칙**(19행 "1회 실패는 중량 반복, 2회는 5~10% 감량")도 세트별 성공 여부를
  기록하지 않아 구현하지 못했다. `training_log`는 세션 단위 지표만 있다.
- **재조정은 소급 적용되지 않는다.** 조정 시점 이전에 이미 완료된 세션이나 이미 지난 날짜는
  절대 건드리지 않는다 — 이건 의도적인 안전장치지 축소가 아니다.

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

## 아직 남은 미확정 사항 (Phase 5 착수 전 결정하면 좋은 것들)

- **주차별 %1RM 테이블**(`lib/engine/constants.ts`의 `LOAD_TABLE_BY_FAMILY`): 스쿼트/힌지/
  수직밀기 3계열에 코드로 구현은 했지만 여전히 ACSM/StrongLifts 원칙을 참고한 제품 잠정값이고
  코치 검수를 받은 적은 없다.
- **레벨 스코어링 가중치·임계값**: Phase 1에서 `lib/levelAssessment.ts`로 구현은 했지만
  (기술 40%·상대1RM 30%·빈도 20%·목표 10%, 상대1RM 구간·레벨 컷오프 전부 임시값) 실사용자
  데이터로 검증된 적은 없다. 온보딩 마지막 화면에서 사용자가 직접 조정할 수 있게 해둔 것도
  이 불확실성 때문이다.
- **부하 급증 기준선(중앙값)이 프로그램당 처음부터 다시 쌓인다**: Phase 4 섹션에 적었듯
  "개인 28일 중앙값"이 아니라 "이 프로그램에서 완료한 세션"이 모수라, 매번 새 프로그램을
  생성하면 이력이 초기화된다. 여러 프로그램에 걸친 이력을 쓰려면 `training_log`를
  `program_id`(또는 `user_id`) 기준으로도 조회할 수 있게 바꿔야 한다.
- **메트콘 다중 동작 조합·볼륨 장부 조정 4단계·연속 부하 충돌 검사**: "Phase 2 — 의도적으로
  축소한 범위"에 정리한 3가지가 다음으로 붙일 만한 반복 작업이다.
- **기술 실패 종료·근력 증량/실패 규칙**: "Phase 4 — 의도적으로 축소한 범위" 참고. 세트별
  성공 여부를 기록하는 구조가 없으면 구현할 수 없다.
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
