"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  EQUIPMENT_OPTIONS,
  GOAL_LABELS,
  GOAL_OPTIONS,
  HEALTH_FLAG_LABELS,
  HEALTH_FLAG_TYPES,
  LIFT_LABELS,
  LIFTS,
  MOVEMENT_GROUP_LABELS,
  MOVEMENT_GROUPS,
  OCCUPATION_ACTIVITY_LABELS,
  OCCUPATION_ACTIVITY_OPTIONS,
  type Goal,
  type HealthFlagType,
  type Lift,
  type MovementGroup,
} from "@/lib/constants";

export interface OnboardingInitialData {
  profile: {
    age: number | null;
    gender: string | null;
    occupationActivity: string | null;
    heightCm: number | null;
    weightKg: number | null;
    recentTrainingFrequency: number | null;
    trainingDaysPerWeek: number | null;
    sessionMinutesBudget: number | null;
    equipmentAvailable: string[];
    spaceType: string | null;
    primaryGoals: string[];
  } | null;
  oneRms: { lift: string; valueKg: number; isEstimated: boolean }[];
  capabilities: { movementGroup: string; passed: boolean }[];
  healthFlags: { flagType: string; active: boolean }[];
}

type Step = 1 | 2 | 3 | 4 | 5;

interface LevelAssessmentResult {
  score: number;
  breakdown: { skill: number; relativeOneRm: number; frequency: number; goal: number };
  suggestedLevel: 1 | 2 | 3 | 4;
  finalLevel: 1 | 2 | 3 | 4;
}

function toInputString(v: number | null): string {
  return v === null || v === undefined ? "" : String(v);
}

export default function OnboardingWizard({ initialData }: { initialData: OnboardingInitialData }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [age, setAge] = useState(toInputString(initialData.profile?.age ?? null));
  const [gender, setGender] = useState(initialData.profile?.gender ?? "");
  const [occupationActivity, setOccupationActivity] = useState(initialData.profile?.occupationActivity ?? "");
  const [heightCm, setHeightCm] = useState(toInputString(initialData.profile?.heightCm ?? null));
  const [weightKg, setWeightKg] = useState(toInputString(initialData.profile?.weightKg ?? null));
  const [recentTrainingFrequency, setRecentTrainingFrequency] = useState(
    toInputString(initialData.profile?.recentTrainingFrequency ?? null)
  );

  const initialOneRm = useMemo(() => {
    const map = new Map(initialData.oneRms.map((rm) => [rm.lift, rm]));
    const record = {} as Record<Lift, { value: string; isEstimated: boolean }>;
    for (const lift of LIFTS) {
      const existing = map.get(lift);
      record[lift] = { value: toInputString(existing?.valueKg ?? null), isEstimated: existing?.isEstimated ?? false };
    }
    return record;
  }, [initialData.oneRms]);
  const [oneRm, setOneRm] = useState(initialOneRm);

  const initialCapability = useMemo(() => {
    const map = new Map(initialData.capabilities.map((c) => [c.movementGroup, c.passed]));
    const record = {} as Record<MovementGroup, boolean>;
    for (const group of MOVEMENT_GROUPS) record[group] = map.get(group) ?? false;
    return record;
  }, [initialData.capabilities]);
  const [capability, setCapability] = useState(initialCapability);

  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState<4 | 5>(
    (initialData.profile?.trainingDaysPerWeek as 4 | 5 | undefined) ?? 4
  );
  const [sessionMinutesBudget, setSessionMinutesBudget] = useState(
    toInputString(initialData.profile?.sessionMinutesBudget ?? null)
  );
  const [equipmentAvailable, setEquipmentAvailable] = useState<string[]>(initialData.profile?.equipmentAvailable ?? []);
  const [spaceType, setSpaceType] = useState(initialData.profile?.spaceType ?? "");
  const [primaryGoals, setPrimaryGoals] = useState<string[]>(initialData.profile?.primaryGoals ?? []);

  const initialHealthFlags = useMemo(() => {
    const map = new Map(initialData.healthFlags.map((f) => [f.flagType, f.active]));
    const record = {} as Record<HealthFlagType, boolean>;
    for (const flag of HEALTH_FLAG_TYPES) record[flag] = map.get(flag) ?? false;
    return record;
  }, [initialData.healthFlags]);
  const [healthFlags, setHealthFlags] = useState(initialHealthFlags);

  const [result, setResult] = useState<LevelAssessmentResult | null>(null);
  const [levelOverride, setLevelOverride] = useState<1 | 2 | 3 | 4 | null>(null);

  async function postJson(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "요청을 처리하지 못했습니다");
    return data;
  }

  async function handleStep1(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await postJson("/api/onboarding/profile", {
        age: Number(age),
        gender: gender || undefined,
        occupationActivity,
        heightCm: heightCm ? Number(heightCm) : undefined,
        weightKg: Number(weightKg),
        recentTrainingFrequency: Number(recentTrainingFrequency),
      });
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStep2(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await postJson("/api/onboarding/one-rm", {
        entries: LIFTS.map((lift) => ({
          lift,
          valueKg: Number(oneRm[lift].value || 0),
          isEstimated: oneRm[lift].isEstimated,
        })),
      });
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStep3(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await postJson("/api/onboarding/capability", {
        entries: MOVEMENT_GROUPS.map((movementGroup) => ({ movementGroup, passed: capability[movementGroup] })),
      });
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStep4(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (primaryGoals.length === 0) {
      setError("목표를 1개 이상 선택하세요");
      return;
    }
    setSubmitting(true);
    try {
      await postJson("/api/onboarding/resources-goals", {
        trainingDaysPerWeek,
        sessionMinutesBudget: Number(sessionMinutesBudget),
        equipmentAvailable,
        spaceType: spaceType || undefined,
        primaryGoals,
        entries: HEALTH_FLAG_TYPES.map((flagType) => ({ flagType, active: healthFlags[flagType] })),
      });
      const data = await postJson("/api/onboarding/complete", {});
      setResult({
        score: data.assessment.score,
        breakdown: data.assessment.breakdown,
        suggestedLevel: data.assessment.suggestedLevel,
        finalLevel: data.assessment.finalLevel,
      });
      setLevelOverride(data.assessment.suggestedLevel);
      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmLevel() {
    if (!levelOverride) return;
    setError(null);
    setSubmitting(true);
    try {
      await postJson("/api/onboarding/complete", { finalLevel: levelOverride });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  const hasBlockingFlag = HEALTH_FLAG_TYPES.some((f) => healthFlags[f] && HEALTH_FLAG_LABELS[f].blocking);

  return (
    <div className="card">
      <div className="progress">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className={`step ${step >= n ? "done" : ""}`} />
        ))}
      </div>
      {error && <div className="error-banner">{error}</div>}

      {step === 1 && (
        <form onSubmit={handleStep1}>
          <h2>1. 기본 정보</h2>
          <div className="field">
            <label htmlFor="age">나이</label>
            <input id="age" type="number" required min={10} max={100} value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="gender">성별 (선택)</label>
            <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">선택 안 함</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
              <option value="other">기타</option>
              <option value="prefer_not_to_say">응답 안 함</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="occupation">직업 활동량</label>
            <select
              id="occupation"
              required
              value={occupationActivity}
              onChange={(e) => setOccupationActivity(e.target.value)}
            >
              <option value="" disabled>
                선택하세요
              </option>
              {OCCUPATION_ACTIVITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {OCCUPATION_ACTIVITY_LABELS[opt]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="height">신장 (cm, 선택)</label>
            <input id="height" type="number" min={100} max={250} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="weight">체중 (kg)</label>
            <input id="weight" type="number" required min={30} max={300} step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="freq">최근 8주 평균 주당 훈련일 (0~7)</label>
            <input
              id="freq"
              type="number"
              required
              min={0}
              max={7}
              value={recentTrainingFrequency}
              onChange={(e) => setRecentTrainingFrequency(e.target.value)}
            />
            <span className="hint">레벨 판정에 사용됩니다. 최근 훈련이 없었다면 0을 입력하세요.</span>
          </div>
          <div className="actions">
            <span />
            <button type="submit" disabled={submitting}>
              {submitting ? "저장 중..." : "다음"}
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleStep2}>
          <h2>2. 5대 리프트 1RM</h2>
          <p className="lede" style={{ marginBottom: "1rem" }}>
            실측값이 없다면 최근 3~5RM으로 추정한 값을 입력하고 &quot;추정치&quot;에 체크하세요.
          </p>
          {LIFTS.map((lift) => (
            <div className="field" key={lift}>
              <label htmlFor={`rm-${lift}`}>{LIFT_LABELS[lift]} 1RM (kg)</label>
              <input
                id={`rm-${lift}`}
                type="number"
                required
                min={0}
                max={500}
                step="0.5"
                value={oneRm[lift].value}
                onChange={(e) => setOneRm((prev) => ({ ...prev, [lift]: { ...prev[lift], value: e.target.value } }))}
              />
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={oneRm[lift].isEstimated}
                  onChange={(e) =>
                    setOneRm((prev) => ({ ...prev, [lift]: { ...prev[lift], isEstimated: e.target.checked } }))
                  }
                />
                추정치입니다
              </label>
            </div>
          ))}
          <div className="actions">
            <button type="button" className="secondary" onClick={() => setStep(1)}>
              이전
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? "저장 중..." : "다음"}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleStep3}>
          <h2>3. 기술 체크리스트</h2>
          <p className="lede" style={{ marginBottom: "0.5rem" }}>
            안전하게 수행할 수 있는 항목만 체크하세요. 자가진단이며, 애매하면 체크하지 않는 편이 안전합니다.
          </p>
          {MOVEMENT_GROUPS.map((group) => (
            <div className="checkbox-row" key={group}>
              <input
                type="checkbox"
                id={`cap-${group}`}
                checked={capability[group]}
                onChange={(e) => setCapability((prev) => ({ ...prev, [group]: e.target.checked }))}
              />
              <label htmlFor={`cap-${group}`} className="label-text">
                {MOVEMENT_GROUP_LABELS[group]}
              </label>
            </div>
          ))}
          <div className="actions">
            <button type="button" className="secondary" onClick={() => setStep(2)}>
              이전
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? "저장 중..." : "다음"}
            </button>
          </div>
        </form>
      )}

      {step === 4 && (
        <form onSubmit={handleStep4}>
          <h2>4. 가용 자원 · 목표</h2>
          <div className="field">
            <label>주간 훈련 가능일</label>
            <select value={trainingDaysPerWeek} onChange={(e) => setTrainingDaysPerWeek(Number(e.target.value) as 4 | 5)}>
              <option value={4}>4일</option>
              <option value={5}>5일</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="minutes">세션당 가능 시간(분)</label>
            <input
              id="minutes"
              type="number"
              required
              min={20}
              max={180}
              value={sessionMinutesBudget}
              onChange={(e) => setSessionMinutesBudget(e.target.value)}
            />
          </div>
          <div className="field">
            <label>보유 장비 (복수 선택)</label>
            {EQUIPMENT_OPTIONS.map((eq) => (
              <div className="checkbox-row" key={eq}>
                <input
                  type="checkbox"
                  id={`eq-${eq}`}
                  checked={equipmentAvailable.includes(eq)}
                  onChange={(e) =>
                    setEquipmentAvailable((prev) =>
                      e.target.checked ? [...prev, eq] : prev.filter((v) => v !== eq)
                    )
                  }
                />
                <label htmlFor={`eq-${eq}`} className="label-text">
                  {eq}
                </label>
              </div>
            ))}
          </div>
          <div className="field">
            <label htmlFor="space">운동 공간 (선택)</label>
            <input id="space" type="text" value={spaceType} onChange={(e) => setSpaceType(e.target.value)} placeholder="예: 헬스장, 홈짐, 차고" />
          </div>
          <div className="field">
            <label>우선 목표 (최대 2개)</label>
            {GOAL_OPTIONS.map((goal) => (
              <div className="checkbox-row" key={goal}>
                <input
                  type="checkbox"
                  id={`goal-${goal}`}
                  checked={primaryGoals.includes(goal)}
                  disabled={!primaryGoals.includes(goal) && primaryGoals.length >= 2}
                  onChange={(e) =>
                    setPrimaryGoals((prev) =>
                      e.target.checked ? [...prev, goal] : prev.filter((v) => v !== goal)
                    )
                  }
                />
                <label htmlFor={`goal-${goal}`} className="label-text">
                  {GOAL_LABELS[goal as Goal]}
                </label>
              </div>
            ))}
          </div>
          <div className="field">
            <label>건강 체크</label>
            {HEALTH_FLAG_TYPES.map((flag) => (
              <div className="checkbox-row" key={flag}>
                <input
                  type="checkbox"
                  id={`flag-${flag}`}
                  checked={healthFlags[flag]}
                  onChange={(e) => setHealthFlags((prev) => ({ ...prev, [flag]: e.target.checked }))}
                />
                <div>
                  <label htmlFor={`flag-${flag}`} className="label-text">
                    {HEALTH_FLAG_LABELS[flag].label}
                  </label>
                  {HEALTH_FLAG_LABELS[flag].blocking && <div className="flag-caution">해당 시 전문가 상담을 권장합니다</div>}
                </div>
              </div>
            ))}
            {hasBlockingFlag && (
              <div className="warning-banner">
                안전을 위해 표시하는 안내입니다: 통증·흉통·실신감·신경학적 증상 중 하나 이상에 체크했습니다.
                프로그램을 시작하기 전에 의료 전문가와 상담하는 것을 권장합니다. (계정 생성 자체는 계속 진행할 수 있습니다.)
              </div>
            )}
          </div>
          <div className="actions">
            <button type="button" className="secondary" onClick={() => setStep(3)}>
              이전
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? "계산 중..." : "완료"}
            </button>
          </div>
        </form>
      )}

      {step === 5 && result && (
        <div>
          <h2>레벨 판정 결과</h2>
          <p className="lede">
            아래 점수는 기술 체크(40%) · 상대 1RM(30%) · 최근 훈련 빈도(20%) · 목표(10%)를 합산한 <strong>제품 잠정 기준</strong>입니다.
            경력만으로 판정하지 않으며, 결과가 맞지 않다고 느끼면 직접 조정할 수 있습니다.
          </p>
          <div className="summary-grid">
            <div className="stat">
              <div className="label">종합 점수</div>
              <div className="value">{result.score.toFixed(1)} / 10</div>
            </div>
            <div className="stat">
              <div className="label">기술</div>
              <div className="value">{result.breakdown.skill.toFixed(1)}</div>
            </div>
            <div className="stat">
              <div className="label">상대 1RM</div>
              <div className="value">{result.breakdown.relativeOneRm.toFixed(1)}</div>
            </div>
            <div className="stat">
              <div className="label">훈련 빈도</div>
              <div className="value">{result.breakdown.frequency.toFixed(1)}</div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="levelOverride">최종 레벨 (제안값: Level {result.suggestedLevel})</label>
            <select
              id="levelOverride"
              value={levelOverride ?? result.suggestedLevel}
              onChange={(e) => setLevelOverride(Number(e.target.value) as 1 | 2 | 3 | 4)}
            >
              <option value={1}>Level 1 · 초급자</option>
              <option value={2}>Level 2 · 중급자</option>
              <option value={3}>Level 3 · 고급자</option>
              <option value={4}>Level 4 · 선수급</option>
            </select>
          </div>
          <div className="actions">
            <span />
            <button type="button" onClick={handleConfirmLevel} disabled={submitting}>
              {submitting ? "저장 중..." : "확인하고 대시보드로"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
