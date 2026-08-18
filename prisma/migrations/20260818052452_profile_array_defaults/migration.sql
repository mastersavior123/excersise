-- AlterTable
ALTER TABLE "user_profile" ALTER COLUMN "equipment_available" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "primary_goals" SET DEFAULT ARRAY[]::TEXT[];
