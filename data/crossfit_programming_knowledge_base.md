# 크로스핏 자동 프로그램 생성 앱용 지식베이스 v0.2

작성일: 2026-08-13  
범위: Box Programming, HWPO, StrongLifts 5×5, Bob Takano, Oleksiy Torokhtiy, Catalyst Athletics, CrossFit 교육 자료, ACSM 저항훈련 근거, CrossFit 공식 YouTube 동작 데모 및 2017~2026 CrossFit Open 공식 워크아웃의 공개 자료 합성

> 이 문서는 앱 설계용 초안이다. 특정 브랜드의 유료 일일 루틴을 복제하지 않고, 공개된 구조·원칙·운동 분류만 데이터화했다. 레벨별 볼륨 범위는 임상 처방이 아니라 코치 검증이 필요한 제품 기본값이다.

> v0.2 변경: 운동 DB를 96개에서 115개로 확장하고, 최근 10개 오픈 시즌의 39개 워크아웃·44개 정규화 동작·공식 CrossFit YouTube 직접 링크 19개를 추가했다. 오픈 데이터는 `Individual Men Rx`를 인덱스 기준으로 사용하며, 성별·연령·Scaled/Foundations 부하와 세부 동작 표준은 공식 원문을 우선한다.

## 1. 조사 범위와 해석

- “The Box Programming”은 검색 결과가 두 서비스로 나뉘었다. 이 DB는 수업 구성과 컨쥬게이트 기반을 공개적으로 설명하는 [Box Programming](https://boxprogramming.com/)을 핵심 참조로 삼았다. `theboxprogramming.com`은 공개 방법론 정보가 적어 세부 규칙의 근거로 사용하지 않았다.
- “토로키”는 올림픽 역도 선수·코치 Oleksiy Torokhtiy로 해석했다.
- HWPO, Box Programming, Torokhtiy의 유료 세션·주차별 루틴은 수집하거나 재현하지 않았다.
- 과학적 근거와 코치 경험, 이 문서에서 새로 만든 제품 휴리스틱을 구분했다.
- “최근 10년”은 현재 시점의 최근 10개 완결 오픈 시즌인 **2017~2026년**으로 정의했다.
- YouTube 전체 채널은 동적으로 변하므로 “모든 영상”을 고정 목록으로 간주하지 않았다. 현재 CrossFit Essentials의 핵심 동작과 검색으로 직접 확인한 공식 데모를 연결하고 `검증일`을 기록했다.

## 2. 프로그램별 채택 개념

| 출처 | 공개 자료에서 확인한 구조 | 앱에 채택한 개념 | 채택하지 않은 것 |
|---|---|---|---|
| Box Programming | 워밍업, 근력/기술, 메트콘, 쿨다운, 수업 브리프; 컨쥬게이트 기반 | 세션 슬롯, 계획적 변동, 보조운동과 회복 포함 | 유료 일일 WOD |
| HWPO Flagship | 근력·컨디셔닝·기술의 점진적 단계, 주 4~6일, 60분/풀 트랙, 매 4주 디로드 | 4주 메조사이클, 시간 예산별 트랙, 시즌 역산 | 세션별 독점 콘텐츠 |
| StrongLifts 5×5 | A/B 교대, 주 3회, 주요 리프트 5×5, 데드리프트 1×5, 성공 시 증량 | 초급·중급 비기술 복합리프트의 단순 선형 진행 | 역도 클래식 리프트에 5×5 적용 |
| Bob Takano | 중급 8주·고급 12주 경기 역산; 속도·폭발성·복잡도 순 운동 배치 | 거시주기, 기술/파워 우선 순서, 세션 목표 | 모든 세션에 동일한 고정 운동 |
| Catalyst Athletics | 4~5일 스케줄, 큰 날/작은 날 교대, 기술 드릴과 훈련 운동 구분, 콤플렉스로 볼륨 절약 | 피로 파형, 기술 교정 슬롯, 다목적 콤플렉스 | 엘리트 볼륨의 무비판적 복제 |
| Torokhtiy | 초보 3회, 중급 4~5회, 상위급 더 높은 빈도; 4 메인+1 회복일 예시 | 초급 4일 중 1일을 기술/회복으로, 중급 이상 4~5일 | 국가·국제급의 8~15회 빈도를 일반 사용자에게 적용 |
| CrossFit 교육 | 모달리티·기능·부하·반복·거리·시간영역의 변동, 커플릿/트리플릿, 자극 보존 스케일링 | 메트콘 생성 문법과 사후 감사 | 무작위성 자체를 목표로 사용 |
| ACSM 2026 | 주요 근육 주 2회 이상; 근력은 고부하·완전 ROM·2~3세트·세션 초반이 유리; 파워 30~70% 1RM; 근비대는 주 10세트 이상에서 이점 | 근력 노출 하한, 핵심 리프트 순서, 하드세트 장부 | 건강한 성인 집단 평균을 선수 개별 처방으로 간주 |

주요 공개 근거:

- [Box Programming](https://boxprogramming.com/)
- [HWPO Flagship](https://www.hwpotraining.com/programs/hwpo-flagship)
- [StrongLifts 5×5 공식 가이드](https://stronglifts.com/stronglifts-5x5/workout-program/)
- [Bob Takano — Programming Planning](https://www.takanoweightlifting.com/new-blogs/2020/3/31/programming-planning)
- [Bob Takano — Exercise Order and Selection](https://www.takanoweightlifting.com/new-blogs/2020/3/17/exercise-order-and-selection)
- [Catalyst — Week Structure](https://www.catalystathletics.com/article/2232/Weightlifting-Program-Design-The-Week-Structure/)
- [Catalyst — Exercise Selection](https://www.catalystathletics.com/article/2256/Exercise-Selection-for-Technical-Improvement/)
- [Torokhtiy — Training Volume](https://torokhtiy.com/blogs/guides/what-is-training-volume)
- [CrossFit — Programming Basics Part 1](https://www.crossfit.com/pro-coach/programming-basics-part-1)
- [ACSM 2026 Position Stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/)

## 3. CrossFit Open·공식 영상 보완 범위

### 오픈 워크아웃 커버리지

| 시즌 | 워크아웃 | DB에 반영한 대표 동작 |
|---:|---|---|
| 2017 | 17.1~17.5 | 덤벨 스내치, 버피 박스 점프오버, 가중 워킹 런지, 파워 클린, 스쿼트 스내치 |
| 2018 | 18.1~18.5 | DB 행 클린앤저크, DB 스쿼트, 바페이싱 버피, 링/바 머슬업, 핸드스탠드 워크 |
| 2019 | 19.1~19.5 | DB 오버헤드 런지, DB 박스 스텝업, 스트릭트 HSPU, 스내치, 바 머슬업 |
| 2020 | 20.1~20.5 | 그라운드투오버헤드, DB 스러스터, 클린앤저크, 피스톨, 링 머슬업 |
| 2021 | 21.1~21.4 | 월워크, 버피 박스 점프오버, 프론트 스쿼트, 클린·행 클린·저크 콤플렉스 |
| 2022 | 22.1~22.3 | 박스 점프오버, 바페이싱 버피, 풀업·체스트투바·바 머슬업 진행 |
| 2023 | 23.1~23.3 | 버피 풀업, 셔틀런, 1RM 스러스터, 스트릭트 HSPU |
| 2024 | 24.1~24.3 | 덤벨 측면 버피 오버, 로우·데드리프트·더블언더, 바 머슬업 |
| 2025 | 25.1~25.3 | DB 행 클린투오버헤드, 워킹 런지, 월워크, 클린·스내치 |
| 2026 | 26.1~26.3 | 메디신볼 박스 스텝오버, DB 오버헤드 런지, 바 넘기 버피 |

Excel의 `Open_Workouts`에는 공식 페이지 한 행당 한 워크아웃을, `Open_Movement_Index`에는 표기 변형을 정규화한 `ExerciseID`, 등장 횟수·시즌·워크아웃·최근 등장 연도를 저장했다. 같은 동작이라도 생성기 자극이 달라지는 다음 변형은 별도 ID로 분리했다.

- `Bar-facing Burpee`, `Lateral Burpee over Dumbbell`, `Burpee over Bar`, `Burpee Box Jump-over`, `Burpee Pull-up`
- `Dumbbell Overhead Walking Lunge`, `Dumbbell Front-rack Walking Lunge`, `Dumbbell Box Step-up`
- `Dumbbell Hang Clean and Jerk`, `Dumbbell Hang Clean-to-Overhead`, `Dumbbell Thruster`, `Dumbbell Squat`
- `Ground-to-Overhead`, `Clean and Jerk`, `Hang Clean`, `Strict Handstand Push-up`, `Shuttle Run`, `Medicine-ball Box Step-over`

`Squat Clean → Clean`, `Squat Snatch → Snatch`, `Single-leg Squat → Pistol Squat`, `Alternating Dumbbell Snatch → Dumbbell Snatch`처럼 자극·장비·기술 계열이 같은 표기는 별도 운동을 중복 생성하지 않고 alias로 연결한다.

### 공식 CrossFit YouTube 연결 원칙

`Official_Videos`에는 직접 확인한 19개 공식 영상만 넣었다. 여기에는 CrossFit의 9개 foundational movements 중 기존 DB에서 빠졌던 `Sumo Deadlift High Pull`을 포함하며, 운동별 URL은 `Exercise_DB`의 `공식 YouTube` 열에도 역참조된다. 영상 링크가 없더라도 [CrossFit Essentials Movements](https://www.crossfit.com/essentials/movements)를 기본 학습 진입점으로 둔다.

영상은 앱에서 다음 용도로만 사용한다.

1. 코치 설명을 대체하는 자동 처방 근거가 아니라 동작 미리보기·용어 확인용이다.
2. 링크가 삭제·교체될 수 있으므로 `검증일`, 채널, 영상 ID를 보관한다.
3. 오픈의 판정 표준은 일반 데모가 아니라 해당 연도 워크아웃 페이지와 scorecard를 우선한다.

## 4. 앱의 핵심 원칙

1. 세션 순서는 `워밍업 → 기술/파워 → 주근력 → 보조 → 메트콘 → 쿨다운`이다.
2. 스케일링은 운동명보다 시간영역, 기능, 상대 부하, 연속 가능한 반복 수를 보존한다.
3. 기술 진입은 `Mechanics → Consistency → Intensity` 게이트를 통과해야 한다.
4. 큰 날 다음에는 작은 날 또는 휴식을 둔다.
5. 메트콘은 기본적으로 2~3개 동작의 보완적 조합으로 만든다.
6. 근력의 5×5는 초급·중급의 스쿼트, 프레스, 로우 등 비기술 복합리프트에만 선택 적용한다.
7. 역도는 반복 수보다 성공률, 속도, 자세를 우선한다. 2회 연속 기술 실패 시 종료 또는 회귀한다.
8. 교정 드릴은 새 운동을 무한히 더하지 않고 워밍업이나 콤플렉스에 통합한다.
9. 4주차를 기본 디로드로 두되 수면·통증·세션 부하로 앞당길 수 있다.
10. 주간 부하는 서로 다른 단위를 한 점수로 섞지 않고 별도 장부로 추적한다.

## 5. 운동 데이터 모델

Excel의 `Exercise_DB` 시트에는 115개 운동이 들어 있다. 각 행의 필드는 다음과 같다.

| 필드 | 의미 | 생성기에서의 용도 |
|---|---|---|
| `ExerciseID` | 안정적인 운동 키 | 로그·번역·영상 연결 |
| `한글명`, `English` | 표시 이름 | 다국어 UI |
| `모달리티` | 체조 / 웨이트리프팅 / 모노스트럭처럴 | 주간 다양성 검사 |
| `계열` | 스쿼트, 힌지, 스내치, 클린, 저크, 캐리 등 | 약점·피로 분류 |
| `주 패턴` | 수직 밀기, 수평 당기기, 힌지 등 | 보완적 메트콘 조합 |
| `권장 슬롯` | 기술, 주근력, 보조, 메트콘 등 | 세션 순서 결정 |
| `장비` | 필요 장비 | 사용자 체육관 필터 |
| `MinLevel` | 1~4 | 레벨 게이트 |
| `Skill 1-5` | 기술 복잡도 | 피로 상태 사용 제한 |
| `충격` | 낮음 / 중간 / 높음 | 접촉량 장부 |
| `처방 단위` | 회, 품질회, 세트×회, m, 분 등 | 볼륨 집계 방식 |
| `기본 용량` | 일반 시작 범위 | 후보 처방 생성 |
| `상대 부하` | 무부하 / 가벼움 / 중간 / 무거움 | 자극 보존 |
| `회귀`, `진행` | 스케일 사슬 | 자동 대체 |
| `금기/주의` | 동작별 경고 플래그 | 안전 필터 |
| `SourceID`, `Source URL` | 명칭·개념 근거 | 감사 가능성 |
| `Open Rx 2017-26` | 최근 10개 시즌 Rx 출현 여부 | 오픈 관련 후보 필터 |
| `Open 워크아웃 수`, `Open 시즌`, `Open 워크아웃`, `최근 Open` | 역사적 출현 메타데이터 | 빈도 분석·벤치마크 선택·편향 방지 |
| `CrossFit Movements`, `공식 YouTube` | 공식 학습 진입점과 검증된 직접 영상 | 동작 도움말 UI |

운동의 `MinLevel`은 “이 레벨에서 반드시 해야 한다”가 아니라 자동 생성기가 선택할 수 있는 최소 문턱이다. 실제 선택은 기술 체크와 통증·장비·세션 목표를 다시 통과해야 한다.

## 6. 네 사용자 그룹

| Level | 그룹 | 빈도 | 기본 주간 구조 | 세션 | 고강도일 상한 | 핵심 목표 |
|---:|---|---|---|---|---:|---|
| 1 | 초급자 | 4일 | 3 훈련 + 1 기술/회복 | 45~70분 | 2 | 기술 습득, 습관, 기본 근력 |
| 2 | 중급자 | 4~5일 | 3 큰/중간 + 1~2 작은/회복 | 60~90분 | 2~3 | 균형 발전, 약점 블록 |
| 3 | 고급자 | 5일 | 3 큰 + 2 작은 | 75~120분 | 3 | 고급 기술, 약점 특화, 경기형 조합 |
| 4 | 선수급 | 5일, 선택적 2부제 | 3 큰 + 2 작은 | 90~150분 | 3~4 | 시즌 역산, 테스트, 대회 준비 |

레벨 판정은 경력만으로 하지 않는다. 최소 입력값은 다음과 같다.

- 최근 8주 실제 훈련 빈도와 중단일
- 스쿼트·힌지·오버헤드·당기기 기본 기술 체크
- 스내치·클린·저크, 풀업·인버전 기술 체크
- 최근 통증, 수술, 임신, 심혈관 경고와 의료 제한
- 수면, 직업·육아 스트레스, 운동 가능 시간
- 장비, 공간, 코치 감독 여부
- 일반 체력 / 근력 / 역도 / 체조 / 대회 중 우선 목표

## 7. 주간 적정 운동량: 단일 점수 대신 6개 장부

아래 범위는 공개 근거를 앱에 적용하기 위한 **보수적 시작값**이다. 사용자의 2~4주 반응으로 보정한다.

| 장부 | 초급 | 중급 | 고급 | 선수급 | 집계 규칙 |
|---|---:|---:|---:|---:|---|
| 근력 하드세트/패턴/주 | 4~8 | 6~12 | 8~16 | 10~18 | RIR 1~4 작업세트, 워밍업 제외 |
| 역도 품질반복/주 | 30~60 | 50~100 | 80~150 | 100~200 | 60%+ 또는 명확한 기술 목적의 성공 반복 |
| 고강도 메트콘/주 | 16~30분 | 25~45분 | 35~60분 | 45~75분 | RPE 8+의 실제 작업시간 |
| Zone 2/저강도 유산소/주 | 20~50분 | 30~75분 | 40~90분 | 45~105분 | 지속 대화 가능한 페이스 |
| 체조 기술연습/주 | 20~40분 | 30~60분 | 45~90분 | 60~120분 | 실패 전 기술 연습 시간 |
| 고충격 접촉/주 | 20~50 | 40~90 | 60~130 | 80~160 | 점프·고충격 착지 추정치 |

### 하드세트 중복 집계

- 주동 패턴은 `1.0세트`로 계산한다.
- 의미 있는 보조 패턴은 `0.5세트`로 계산한다.
- 예: 스러스터 4세트는 스쿼트 4세트, 수직 밀기 2세트로 볼 수 있다.
- 메트콘의 가벼운 고반복은 근력 하드세트에 넣지 않고 고강도 시간과 패턴 노출에 기록한다.
- 근비대 목표가 있을 때 주 10세트 이상이 유리할 수 있지만, 크로스핏의 역도·체조·메트콘 기여량을 중복 계산하지 않는다.

### 자동 감량 조건

- 수면 5시간 이하, 통증 6/10 이상, 의욕 3/10 이하 중 2개 이상이면 당일 볼륨 30~40% 감량
- 최근 3일 `session RPE × 총 분`이 개인 28일 중앙값보다 30% 이상 높으면 다음 큰 날을 작은 날로 변경
- 2회 연속 기술 실패 또는 속도 급감 시 해당 기술 운동 종료
- 날카로운 통증, 흉통, 실신감, 신경학적 증상은 프로그램 생성을 중단하고 전문가 평가 안내

위 임계값은 연구에서 확정된 보편 기준이 아니라 베타 제품 휴리스틱이다. 앱 출시 전 코치·의료 자문과 실제 사용자 데이터로 검증해야 한다.

## 8. 4일·5일 기본 주간 골격

### 주 4일

| 일 | 유형 | 세션 골격 |
|---|---|---|
| 월 | 큰 날 | 역도 기술/파워 → 하체 스쿼트 → 7~10분 커플릿 |
| 화 | 작은 날 | 체조 기술 → 상체 보조 → 20~35분 저강도 |
| 목 | 큰 날 | 클린/저크 → 힌지/풀 → 11~16분 트리플릿 |
| 토 | 중간/혼합 | 전신 근력 또는 5×5 변형 → 16~25분 기술형 메트콘 |

초급자는 네 번째 날을 완전한 고강도일로 만들지 않는다. 기술·Zone 2·모빌리티를 포함한 회복 가능한 세션으로 쓸 수 있다.

### 주 5일

`Big – Little – Big – Little – Big`을 기본으로 하고 금요일 휴식 후 토요일 큰 날을 허용한다.

| 일 | 유형 | 세션 골격 |
|---|---|---|
| 월 | 큰 날 | 스내치 → 스쿼트 → 5~10분 메트콘 |
| 화 | 작은 날 | 저크/오버헤드 기술 → 체조 → 저강도 |
| 수 | 큰 날 | 클린 → 풀/힌지 → 11~18분 메트콘 |
| 목 | 작은 날 | 파워 변형 → 보조/프리햅 → 기술형 인터벌 |
| 토 | 큰 날 | 레벨별 중량 조합/테스트 → 스쿼트 → 경기형 혼합 |

## 9. 자동 생성 순서

```text
1. 사용자 안전·장비·시간 입력 검증
2. 기술 체크를 포함한 Level 판정
3. 이번 4주 블록의 1~2개 우선 목표 선택
4. 4일 또는 5일 Big/Little 골격 선택
5. 각 날의 시간영역·패턴·모달리티·상대 부하 목표 결정
6. Exercise_DB에서 MinLevel, 장비, 금기, 충돌 조건으로 후보 필터
7. 기술/파워 → 주근력 → 보조 → 메트콘 순으로 배치
8. V01~V06 주간 장부 계산
9. 연속 큰 날, 동일 관절 고부하, 그립·어깨·후면사슬 충돌 검사
10. 범위 초과 시 보조 제거 → 세트 감소 → 운동 회귀 → 저강도 전환 순으로 조정
11. 스케일링 옵션과 목표 자극을 함께 출력
12. 완료 로그로 다음 주 부하·볼륨을 증량, 유지 또는 감량
```

### 생성 후 필수 감사 항목

- 스쿼트, 힌지, 수직 밀기/당기기, 수평 밀기/당기기가 7~10일 안에 모두 노출되는가?
- 웨이트리프팅, 체조, 모노스트럭처럴 모달리티가 고르게 포함되는가?
- 매우 짧음, 짧음, 중간, 긴 시간영역 중 주간 목표 수가 충족되는가?
- 동일 관절·그립·후면사슬의 고부하가 연속되는가?
- 사용자의 장비와 기술 수준으로 회귀 동작까지 수행 가능한가?
- 고강도 분, 품질반복, 하드세트, 충격 접촉이 각 장부 범위 안에 있는가?
- 디로드 주에는 실패 허용이 0이고 총량이 평소의 약 60~75%인가?

## 10. 앱 데이터 구조 예시

```json
{
  "exercise_id": "EX039",
  "name_ko": "파워 클린",
  "name_en": "Power Clean",
  "modality": "weightlifting",
  "family": "olympic_clean",
  "primary_pattern": ["hinge", "explosive_pull", "front_rack"],
  "recommended_slots": ["skill", "metcon"],
  "equipment": ["barbell", "plates"],
  "min_level": 1,
  "skill_complexity": 3,
  "impact": "moderate",
  "dose_unit": "quality_reps",
  "default_dose": {"sets_min": 4, "sets_max": 8, "reps_min": 1, "reps_max": 3},
  "regression_id": "EX040",
  "progression_id": "EX038",
  "fatigue_tags": ["posterior_chain", "grip", "front_rack"],
  "source_id": "S14",
  "open_rx_2017_2026": true,
  "open_appearances": ["17.2"],
  "official_movement_url": "https://www.crossfit.com/essentials/movements",
  "official_video_url": null
}
```

실제 개발에서는 `exercise`, `exercise_alias`, `exercise_relation`, `open_workout`, `open_workout_movement`, `official_media`, `weekly_ledger`, `session_template`, `generator_rule`, `user_capability`, `training_log`를 별도 테이블로 정규화하는 편이 좋다. Excel의 `회귀`·`진행` 문자열은 다음 단계에서 ID 기반 관계 테이블로 변환해야 한다.

## 11. 출시 전 검증 과제

1. CrossFit L2+ 코치와 역도 코치가 115개 운동의 `MinLevel`, 금기, 회귀·진행 사슬을 검수한다.
2. 초급·중급·고급·선수급 각 20명 이상의 4주 파일럿으로 완료율, 통증 증가, RPE, 기술 실패율을 수집한다.
3. 생성기 결과를 블라인드로 코치가 평가하고 위험 조합, 자극 불일치, 불필요한 볼륨을 라벨링한다.
4. 주간 장부 범위는 사용자 반응에 따라 베이지안 또는 규칙 기반으로 개인화한다.
5. 브랜드명은 출처 설명에만 쓰고, 상업적 제품에서는 상표·저작권·라이선스 검토를 한다.
6. 의료·임신·재활·청소년·고령자 특수군은 별도 규칙 세트와 전문가 승인을 마련한다.

## 12. 전체 출처 목록

1. https://boxprogramming.com/
2. https://www.hwpotraining.com/programs/hwpo-flagship
3. https://stronglifts.com/stronglifts-5x5/workout-program/
4. https://www.takanoweightlifting.com/new-blogs/2020/3/31/programming-planning
5. https://www.takanoweightlifting.com/new-blogs/2020/3/17/exercise-order-and-selection
6. https://www.catalystathletics.com/article/2232/Weightlifting-Program-Design-The-Week-Structure/
7. https://www.catalystathletics.com/article/2256/Exercise-Selection-for-Technical-Improvement/
8. https://www.catalystathletics.com/article/2031/Multidimensionality-in-Weightlifting-Programming-Do-More-wit/
9. https://torokhtiy.com/blogs/guides/what-is-training-volume
10. https://torokhtiy.com/blogs/guides/volume-vs-intensity
11. https://www.crossfit.com/pro-coach/programming-basics-part-1
12. https://library.crossfit.com/free/pdf/CFJ_English_Level1_TrainingGuide.pdf
13. https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/
14. https://www.catalystathletics.com/exercises/
15. https://www.crossfit.com/movements/
16. https://www.catalystathletics.com/article/1810/Homeostasis-The-Basis-of-Training/
17. https://store.torokhtiy.com/products/full-set-3-0
18. https://www.crossfit.com/essentials/movements
19. https://www.youtube.com/@CrossFit
20. https://games.crossfit.com/workouts/open/2017
21. https://games.crossfit.com/workouts/open/2018
22. https://games.crossfit.com/workouts/open/2019
23. https://games.crossfit.com/workouts/open/2020
24. https://games.crossfit.com/workouts/open/2021
25. https://games.crossfit.com/workouts/open/2022
26. https://games.crossfit.com/workouts/open/2023
27. https://games.crossfit.com/workouts/open/2024
28. https://games.crossfit.com/workouts/open/2025
29. https://games.crossfit.com/workouts/open/2026
