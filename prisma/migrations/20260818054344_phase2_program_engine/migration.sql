-- CreateTable
CREATE TABLE "program" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "frequency" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "priority_goals" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_week" (
    "id" SERIAL NOT NULL,
    "program_id" TEXT NOT NULL,
    "week_index" INTEGER NOT NULL,
    "is_deload" BOOLEAN NOT NULL DEFAULT false,
    "load_multiplier" DECIMAL(65,30) NOT NULL DEFAULT 1.0,

    CONSTRAINT "program_week_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_day" (
    "id" SERIAL NOT NULL,
    "program_week_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "day_type" TEXT NOT NULL,
    "template_id" TEXT,

    CONSTRAINT "program_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_block" (
    "id" SERIAL NOT NULL,
    "program_day_id" INTEGER NOT NULL,
    "slot" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "prescription" JSONB NOT NULL,

    CONSTRAINT "program_block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_ledger" (
    "id" SERIAL NOT NULL,
    "program_week_id" INTEGER NOT NULL,
    "ledger_id" TEXT NOT NULL,
    "planned_value" DECIMAL(65,30) NOT NULL,
    "min_value" DECIMAL(65,30) NOT NULL,
    "max_value" DECIMAL(65,30) NOT NULL,
    "within_range" BOOLEAN NOT NULL,

    CONSTRAINT "weekly_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "program_week_program_id_week_index_key" ON "program_week"("program_id", "week_index");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_ledger_program_week_id_ledger_id_key" ON "weekly_ledger"("program_week_id", "ledger_id");

-- AddForeignKey
ALTER TABLE "program" ADD CONSTRAINT "program_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_week" ADD CONSTRAINT "program_week_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_day" ADD CONSTRAINT "program_day_program_week_id_fkey" FOREIGN KEY ("program_week_id") REFERENCES "program_week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_day" ADD CONSTRAINT "program_day_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "session_template"("template_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_block" ADD CONSTRAINT "program_block_program_day_id_fkey" FOREIGN KEY ("program_day_id") REFERENCES "program_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_block" ADD CONSTRAINT "program_block_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("exercise_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_ledger" ADD CONSTRAINT "weekly_ledger_program_week_id_fkey" FOREIGN KEY ("program_week_id") REFERENCES "program_week"("id") ON DELETE CASCADE ON UPDATE CASCADE;
