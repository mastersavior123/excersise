-- CreateTable
CREATE TABLE "training_log" (
    "id" SERIAL NOT NULL,
    "program_day_id" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "rpe" INTEGER,
    "pain" INTEGER,
    "sleep_hours" DECIMAL(65,30),
    "notes" TEXT,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "training_log_program_day_id_key" ON "training_log"("program_day_id");

-- AddForeignKey
ALTER TABLE "training_log" ADD CONSTRAINT "training_log_program_day_id_fkey" FOREIGN KEY ("program_day_id") REFERENCES "program_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;
