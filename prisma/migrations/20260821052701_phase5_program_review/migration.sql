-- CreateTable
CREATE TABLE "program_review" (
    "id" SERIAL NOT NULL,
    "program_id" TEXT NOT NULL,
    "coach_id" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "program_review_program_id_created_at_idx" ON "program_review"("program_id", "created_at");

-- AddForeignKey
ALTER TABLE "program_review" ADD CONSTRAINT "program_review_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_review" ADD CONSTRAINT "program_review_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
