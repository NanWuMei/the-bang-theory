CREATE TABLE IF NOT EXISTS "episodes" (
  "id" serial PRIMARY KEY NOT NULL,
  "season" smallint NOT NULL,
  "episode" smallint NOT NULL,
  "title" text,
  "minio_key" text NOT NULL,
  "duration_ms" integer
);
CREATE UNIQUE INDEX IF NOT EXISTS "episodes_season_episode_idx" ON "episodes" ("season", "episode");

CREATE TABLE IF NOT EXISTS "dialogues" (
  "id" text PRIMARY KEY NOT NULL,
  "episode_id" integer NOT NULL,
  "start_ms" integer NOT NULL,
  "end_ms" integer NOT NULL,
  "text_en" text NOT NULL,
  "text_zh" text,
  "speaker" text,
  "line_index" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "clips" (
  "dialogue_id" text PRIMARY KEY NOT NULL,
  "minio_key" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "file_size" integer,
  "generated_at" timestamp with time zone,
  "error_message" text
);

CREATE TABLE IF NOT EXISTS "shares" (
  "slug" text PRIMARY KEY NOT NULL,
  "dialogue_ids" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "expires_at" timestamp with time zone
);

ALTER TABLE "dialogues" ADD CONSTRAINT "dialogues_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "clips" ADD CONSTRAINT "clips_dialogue_id_dialogues_id_fk" FOREIGN KEY ("dialogue_id") REFERENCES "public"."dialogues"("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "idx_dialogues_episode" ON "dialogues" ("episode_id");
