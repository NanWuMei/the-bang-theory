import {
  pgTable,
  serial,
  text,
  integer,
  smallint,
  timestamp,
  uuid,
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
    storageKey: text("storage_key").notNull(),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("episodes_season_episode_key").on(t.season, t.episode)]
);

/** 字幕行（搜索主体；search_text 为 DB 生成列，不入库） */
export const subtitleLines = pgTable("subtitle_lines", {
  id: text("id").primaryKey(),
  episodeId: integer("episode_id")
    .notNull()
    .references(() => episodes.id, { onDelete: "cascade" }),
  startMs: integer("start_ms").notNull(),
  endMs: integer("end_ms").notNull(),
  enText: text("en_text").notNull(),
  zhText: text("zh_text"),
  speaker: text("speaker"),
  lineIndex: integer("line_index").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/** 切片缓存 */
export const clipCache = pgTable("clip_cache", {
  subtitleLineId: text("subtitle_line_id")
    .primaryKey()
    .references(() => subtitleLines.id, { onDelete: "cascade" }),
  storageKey: text("storage_key"),
  status: text("status").notNull().default("pending"),
  fileSize: integer("file_size"),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
  errorMessage: text("error_message"),
});

/** 素材篮 / 分享 */
export const selectedAssets = pgTable("selected_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  lineIds: text("line_ids").array().notNull(),
  shareTitle: text("share_title"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Episode = typeof episodes.$inferSelect;
export type SubtitleLine = typeof subtitleLines.$inferSelect;
export type ClipCache = typeof clipCache.$inferSelect;
export type SelectedAsset = typeof selectedAssets.$inferSelect;

// 兼容旧命名（逐步废弃）
export const dialogues = subtitleLines;
export type Dialogue = SubtitleLine;
