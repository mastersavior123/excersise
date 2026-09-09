-- AlterTable
ALTER TABLE "program_day" ADD COLUMN     "conditioning_low_intensity" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "conditioning_text" TEXT;

-- CreateTable
CREATE TABLE "block_result" (
    "id" SERIAL NOT NULL,
    "program_block_id" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "block_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "block_result_program_block_id_key" ON "block_result"("program_block_id");

-- AddForeignKey
ALTER TABLE "block_result" ADD CONSTRAINT "block_result_program_block_id_fkey" FOREIGN KEY ("program_block_id") REFERENCES "program_block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

