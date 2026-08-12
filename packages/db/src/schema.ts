import {
  pgTable,
  serial,
  text,
  integer,
  smallint,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** 剧集元信息 */
export const episodes = pgTable(
  "episodes",
  {
    id: serial("id").primaryKey(),
    season: smallint("season").notNull(),
    episode: smallint("episode").notNull(),
    title: text("title"),
    minioKey: text("minio_key").notNull(),
    durationMs: integer("duration_ms"),
  },
  (t) => [uniqueIndex("episodes_season_episode_idx").on(t.season, t.episode)]
);

/** 台词（搜索主体） */
export const dialogues = pgTable("dialogues", {
  id: text("id").primaryKey(),
  episodeId: integer("episode_id")
    .notNull()
    .references(() => episodes.id),
  startMs: integer("start_ms").notNull(),
  endMs: integer("end_ms").notNull(),
  textEn: text("text_en").notNull(),
  textZh: text("text_zh"),
  speaker: text("speaker"),
  lineIndex: integer("line_index").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/** 切片状态（与 MinIO 对象对应） */
export const clips = pgTable("clips", {
  dialogueId: text("dialogue_id")
    .primaryKey()
    .references(() => dialogues.id),
  minioKey: text("minio_key"),
  status: text("status").notNull().default("pending"),
  fileSize: integer("file_size"),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
  errorMessage: text("error_message"),
});

/** 分享快照 */
export const shares = pgTable("shares", {
  slug: text("slug").primaryKey(),
  dialogueIds: jsonb("dialogue_ids").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export type Episode = typeof episodes.$inferSelect;
export type Dialogue = typeof dialogues.$inferSelect;
export type Clip = typeof clips.$inferSelect;
export type Share = typeof shares.$inferSelect;
