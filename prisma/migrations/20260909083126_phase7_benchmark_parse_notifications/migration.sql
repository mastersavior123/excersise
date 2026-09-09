-- AlterTable
ALTER TABLE "benchmark_result" ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "result_kind" TEXT,
ADD COLUMN     "result_load_kg" DECIMAL(65,30),
ADD COLUMN     "result_reps" INTEGER,
ADD COLUMN     "result_rounds" INTEGER,
ADD COLUMN     "result_seconds" INTEGER,
ADD COLUMN     "scaled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "notification" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_user_id_read_at_idx" ON "notification"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "benchmark_result_year_workout_is_public_idx" ON "benchmark_result"("year", "workout", "is_public");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

