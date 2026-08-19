import { z } from "zod";
import { GOAL_OPTIONS, HEALTH_FLAG_TYPES, LIFTS, MOVEMENT_GROUPS, OCCUPATION_ACTIVITY_OPTIONS } from "./constants";

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("올바른 이메일 형식이 아닙니다"),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const basicInfoSchema = z.object({
  age: z.coerce.number().int().min(10, "나이는 10세 이상이어야 합니다").max(100),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  occupationActivity: z.enum(OCCUPATION_ACTIVITY_OPTIONS),
  heightCm: z.coerce.number().min(100).max(250).optional(),
  weightKg: z.coerce.number().min(30, "체중은 30kg 이상이어야 합니다").max(300),
  recentTrainingFrequency: z.coerce
    .number()
    .int()
    .min(0)
    .max(7, "최근 8주 평균 주당 훈련일은 0~7 사이여야 합니다"),
});

export const oneRmSchema = z.object({
  entries: z
    .array(
      z.object({
        lift: z.enum(LIFTS),
        valueKg: z.coerce.number().min(0).max(500),
        isEstimated: z.boolean().default(false),
      })
    )
    .length(LIFTS.length, `${LIFTS.length}개 리프트를 모두 입력해야 합니다`),
});

export const capabilitySchema = z.object({
  entries: z
    .array(
      z.object({
        movementGroup: z.enum(MOVEMENT_GROUPS),
        passed: z.boolean(),
      })
    )
    .length(MOVEMENT_GROUPS.length),
});

export const healthFlagsSchema = z.object({
  entries: z.array(
    z.object({
      flagType: z.enum(HEALTH_FLAG_TYPES),
      active: z.boolean(),
    })
  ),
});

export const resourcesGoalsSchema = z.object({
  trainingDaysPerWeek: z.union([z.literal(4), z.literal(5)]),
  sessionMinutesBudget: z.coerce.number().int().min(20).max(180),
  equipmentAvailable: z.array(z.string().min(1)).max(30),
  spaceType: z.string().max(100).optional(),
  primaryGoals: z.array(z.enum(GOAL_OPTIONS)).min(1, "목표를 1개 이상 선택하세요").max(2, "목표는 최대 2개까지 선택할 수 있습니다"),
});

export const trainingLogSchema = z.object({
  completed: z.boolean(),
  rpe: z.coerce.number().int().min(1).max(10).nullable().optional(),
  pain: z.coerce.number().int().min(0).max(10).nullable().optional(),
  sleepHours: z.coerce.number().min(0).max(24).nullable().optional(),
  notes: z.string().max(2000).optional(),
});
