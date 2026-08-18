-- CreateTable
CREATE TABLE "app_user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile" (
    "user_id" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "occupation_activity" TEXT,
    "height_cm" DECIMAL(65,30),
    "weight_kg" DECIMAL(65,30),
    "recent_training_frequency" INTEGER,
    "training_days_per_week" INTEGER,
    "session_minutes_budget" INTEGER,
    "equipment_available" TEXT[],
    "space_type" TEXT,
    "primary_goals" TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_one_rm" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "lift" TEXT NOT NULL,
    "value_kg" DECIMAL(65,30) NOT NULL,
    "is_estimated" BOOLEAN NOT NULL DEFAULT false,
    "measured_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_one_rm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_capability" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "movement_group" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "checked_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_capability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_health_flag" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "flag_type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_health_flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_level_assessment" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "score" DECIMAL(65,30) NOT NULL,
    "breakdown" JSONB NOT NULL,
    "suggested_level" INTEGER NOT NULL,
    "final_level" INTEGER NOT NULL,
    "assessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_level_assessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- CreateIndex
CREATE INDEX "user_one_rm_user_id_lift_idx" ON "user_one_rm"("user_id", "lift");

-- CreateIndex
CREATE UNIQUE INDEX "user_one_rm_user_id_lift_measured_at_key" ON "user_one_rm"("user_id", "lift", "measured_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_capability_user_id_movement_group_key" ON "user_capability"("user_id", "movement_group");

-- CreateIndex
CREATE UNIQUE INDEX "user_health_flag_user_id_flag_type_key" ON "user_health_flag"("user_id", "flag_type");

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_one_rm" ADD CONSTRAINT "user_one_rm_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_capability" ADD CONSTRAINT "user_capability_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_health_flag" ADD CONSTRAINT "user_health_flag_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_level_assessment" ADD CONSTRAINT "user_level_assessment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
