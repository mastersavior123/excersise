-- CreateTable
CREATE TABLE "exercise" (
    "exercise_id" TEXT NOT NULL,
    "name_ko" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "primary_pattern" TEXT[],
    "recommended_slots" TEXT[],
    "equipment" TEXT[],
    "min_level" INTEGER NOT NULL,
    "skill_complexity" INTEGER NOT NULL,
    "impact" TEXT NOT NULL,
    "dose_unit" TEXT NOT NULL,
    "default_dose_raw" TEXT NOT NULL,
    "default_dose_sets_min" INTEGER,
    "default_dose_sets_max" INTEGER,
    "default_dose_reps_min" INTEGER,
    "default_dose_reps_max" INTEGER,
    "relative_load" TEXT NOT NULL,
    "regression_text" TEXT,
    "progression_text" TEXT,
    "contraindications" TEXT,
    "source_id" TEXT NOT NULL,
    "source_url" TEXT,
    "open_rx_2017_26" BOOLEAN NOT NULL DEFAULT false,
    "open_workout_count" INTEGER NOT NULL DEFAULT 0,
    "open_seasons" INTEGER[],
    "open_workouts" TEXT[],
    "most_recent_open_year" INTEGER,
    "crossfit_movements_url" TEXT,
    "official_youtube_url" TEXT,

    CONSTRAINT "exercise_pkey" PRIMARY KEY ("exercise_id")
);

-- CreateTable
CREATE TABLE "exercise_alias" (
    "alias_name" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,

    CONSTRAINT "exercise_alias_pkey" PRIMARY KEY ("alias_name")
);

-- CreateTable
CREATE TABLE "exercise_relation" (
    "id" SERIAL NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "relation_type" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "target_exercise_id" TEXT NOT NULL,

    CONSTRAINT "exercise_relation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_profile" (
    "level" INTEGER NOT NULL,
    "group_name" TEXT NOT NULL,
    "weekly_frequency" TEXT NOT NULL,
    "criteria_text" TEXT NOT NULL,
    "session_minutes_range" TEXT NOT NULL,
    "weekly_structure" TEXT NOT NULL,
    "high_intensity_cap" TEXT NOT NULL,
    "consecutive_day_cap" TEXT NOT NULL,
    "weekly_goal" TEXT NOT NULL,
    "cautions" TEXT,
    "default_deload" TEXT NOT NULL,

    CONSTRAINT "level_profile_pkey" PRIMARY KEY ("level")
);

-- CreateTable
CREATE TABLE "volume_ledger_rule" (
    "id" SERIAL NOT NULL,
    "ledger_id" TEXT NOT NULL,
    "ledger_name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "min_value" DECIMAL(65,30) NOT NULL,
    "max_value" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "aggregation_rule" TEXT NOT NULL,
    "usage_note" TEXT,
    "evidence_status" TEXT,

    CONSTRAINT "volume_ledger_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_template" (
    "template_id" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "day_label" TEXT NOT NULL,
    "day_type" TEXT NOT NULL,
    "slot_sequence_raw" TEXT NOT NULL,
    "slot_sequence_parsed" TEXT[],
    "conditioning" TEXT,
    "recommended_weekday" TEXT,
    "conflict_note" TEXT,

    CONSTRAINT "session_template_pkey" PRIMARY KEY ("template_id")
);

-- CreateTable
CREATE TABLE "generator_rule" (
    "order_index" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "check_item" TEXT NOT NULL,
    "condition_rule" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "evidence" TEXT,

    CONSTRAINT "generator_rule_pkey" PRIMARY KEY ("order_index")
);

-- CreateTable
CREATE TABLE "scaling_map" (
    "scale_id" TEXT NOT NULL,
    "original_text" TEXT NOT NULL,
    "original_exercise_id" TEXT,
    "regression1_text" TEXT NOT NULL,
    "regression1_exercise_id" TEXT,
    "regression2_text" TEXT NOT NULL,
    "regression2_exercise_id" TEXT,
    "preserved_function" TEXT NOT NULL,
    "stimulus_time" TEXT NOT NULL,
    "coaching_note" TEXT,

    CONSTRAINT "scaling_map_pkey" PRIMARY KEY ("scale_id")
);

-- CreateTable
CREATE TABLE "enum_lookup" (
    "enum_type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label_ko" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "enum_lookup_pkey" PRIMARY KEY ("enum_type","code")
);

-- CreateTable
CREATE TABLE "open_workout" (
    "year" INTEGER NOT NULL,
    "workout" TEXT NOT NULL,
    "format" TEXT,
    "time_cap" TEXT,
    "canonical_movements" TEXT[],
    "structure_note" TEXT,
    "division" TEXT,
    "source_id" TEXT,
    "official_url" TEXT,

    CONSTRAINT "open_workout_pkey" PRIMARY KEY ("year","workout")
);

-- CreateTable
CREATE TABLE "open_workout_movement" (
    "id" SERIAL NOT NULL,
    "canonical_movement" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "workout_count" INTEGER,
    "season_count" INTEGER,
    "seasons_appeared" INTEGER[],
    "workouts_appeared_raw" TEXT,
    "most_recent_year" INTEGER,
    "normalization_note" TEXT,
    "official_youtube_url" TEXT,
    "crossfit_movements_url" TEXT,

    CONSTRAINT "open_workout_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "official_media" (
    "video_id" TEXT NOT NULL,
    "movement" TEXT NOT NULL,
    "exercise_id" TEXT,
    "official_title" TEXT,
    "purpose" TEXT,
    "youtube_url" TEXT NOT NULL,
    "verified_date" DATE,
    "source_id" TEXT,

    CONSTRAINT "official_media_pkey" PRIMARY KEY ("video_id")
);

-- CreateIndex
CREATE INDEX "exercise_family_idx" ON "exercise"("family");

-- CreateIndex
CREATE INDEX "exercise_min_level_idx" ON "exercise"("min_level");

-- CreateIndex
CREATE INDEX "exercise_relation_exercise_id_relation_type_idx" ON "exercise_relation"("exercise_id", "relation_type");

-- CreateIndex
CREATE UNIQUE INDEX "volume_ledger_rule_ledger_id_level_key" ON "volume_ledger_rule"("ledger_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "open_workout_movement_canonical_movement_exercise_id_key" ON "open_workout_movement"("canonical_movement", "exercise_id");

-- AddForeignKey
ALTER TABLE "exercise_alias" ADD CONSTRAINT "exercise_alias_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("exercise_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_relation" ADD CONSTRAINT "exercise_relation_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("exercise_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_relation" ADD CONSTRAINT "exercise_relation_target_exercise_id_fkey" FOREIGN KEY ("target_exercise_id") REFERENCES "exercise"("exercise_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volume_ledger_rule" ADD CONSTRAINT "volume_ledger_rule_level_fkey" FOREIGN KEY ("level") REFERENCES "level_profile"("level") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scaling_map" ADD CONSTRAINT "scaling_map_original_exercise_id_fkey" FOREIGN KEY ("original_exercise_id") REFERENCES "exercise"("exercise_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scaling_map" ADD CONSTRAINT "scaling_map_regression1_exercise_id_fkey" FOREIGN KEY ("regression1_exercise_id") REFERENCES "exercise"("exercise_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scaling_map" ADD CONSTRAINT "scaling_map_regression2_exercise_id_fkey" FOREIGN KEY ("regression2_exercise_id") REFERENCES "exercise"("exercise_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_workout_movement" ADD CONSTRAINT "open_workout_movement_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("exercise_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "official_media" ADD CONSTRAINT "official_media_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("exercise_id") ON DELETE SET NULL ON UPDATE CASCADE;
