-- CreateTable
CREATE TABLE "parameter_review" (
    "key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "reviewed_by_id" TEXT NOT NULL,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parameter_review_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "parameter_review" ADD CONSTRAINT "parameter_review_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

