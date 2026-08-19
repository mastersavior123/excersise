-- AlterTable
ALTER TABLE "training_log" ADD COLUMN     "actual_duration_minutes" INTEGER,
ADD COLUMN     "motivation" INTEGER;

-- CreateTable
CREATE TABLE "program_adjustment_event" (
    "id" SERIAL NOT NULL,
    "program_id" TEXT NOT NULL,
    "program_week_id" INTEGER,
    "trigger_rule" TEXT NOT NULL,
    "action_taken" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_adjustment_event_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "program_adjustment_event" ADD CONSTRAINT "program_adjustment_event_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
