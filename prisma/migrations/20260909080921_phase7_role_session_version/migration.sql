-- AlterTable
ALTER TABLE "app_user" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user',
ADD COLUMN     "session_version" INTEGER NOT NULL DEFAULT 0;

