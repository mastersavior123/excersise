-- CreateTable
CREATE TABLE "benchmark_result" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "workout" TEXT NOT NULL,
    "result_text" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "benchmark_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "benchmark_result_user_id_year_workout_key" ON "benchmark_result"("user_id", "year", "workout");

-- AddForeignKey
ALTER TABLE "benchmark_result" ADD CONSTRAINT "benchmark_result_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_result" ADD CONSTRAINT "benchmark_result_year_workout_fkey" FOREIGN KEY ("year", "workout") REFERENCES "open_workout"("year", "workout") ON DELETE RESTRICT ON UPDATE CASCADE;
