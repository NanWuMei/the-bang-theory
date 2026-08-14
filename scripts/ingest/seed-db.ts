import { readFile } from "fs/promises";
import { eq, like, sql } from "drizzle-orm";
import { getDb, schema } from "@tbbt/db";
import { episodeKey } from "@tbbt/media";
import {
  alignSubtitles,
  subtitleLineId,
  type AlignedDialogue,
} from "./align-bilingual";
import { parseSrt } from "./parse-srt";
import { PATHS, parseSeasonEpisodeArgs, loadEnv } from "./utils";

loadEnv();

/** 插入或更新剧集记录 */
export async function insertEpisode(
  season: number,
  episode: number,
  storageKey?: string
) {
  const db = getDb();
  const key = storageKey ?? episodeKey(season, episode);

  const [row] = await db
    .insert(schema.episodes)
    .values({ season, episode, storageKey: key })
    .onConflictDoUpdate({
      target: [schema.episodes.season, schema.episodes.episode],
      set: { storageKey: key },
    })
    .returning();

  if (!row) throw new Error(`Failed to upsert episode S${season}E${episode}`);
  return row;
}

/** 批量写入字幕行（会先清除该集旧数据） */
export async function insertSubtitleLines(
  episodeId: number,
  season: number,
  episode: number,
  aligned: AlignedDialogue[]
) {
  const db = getDb();
  const idPrefix = `s${String(season).padStart(2, "0")}e${String(episode).padStart(2, "0")}-`;

  // 按 id 前缀清除，避免 episode_id 不一致导致重复
  await db.execute(
    sql`DELETE FROM subtitle_lines WHERE id LIKE ${idPrefix + "%"}`
  );

  const rows = aligned.map((d) => ({
    id: subtitleLineId(season, episode, d.lineIndex),
    episodeId,
    startMs: d.startMs,
    endMs: d.endMs,
    enText: d.textEn,
    zhText: d.textZh,
    lineIndex: d.lineIndex,
  }));

  const batchSize = 200;
  for (let i = 0; i < rows.length; i += batchSize) {
    await db.insert(schema.subtitleLines).values(rows.slice(i, i + batchSize));
  }

  return rows;
}

/** 解析 SRT → 对齐 → 写库 */
export async function ingestEpisode(season: number, episode: number) {
  const [enRaw, zhRaw] = await Promise.all([
    readFile(PATHS.subtitlesEn(season, episode), "utf-8"),
    readFile(PATHS.subtitlesZh(season, episode), "utf-8"),
  ]);

  const aligned = alignSubtitles(parseSrt(enRaw), parseSrt(zhRaw));
  const episodeRow = await insertEpisode(season, episode);
  const rows = await insertSubtitleLines(
    episodeRow.id,
    season,
    episode,
    aligned
  );

  const withZh = rows.filter((r) => r.zhText).length;
  console.log(
    `✓ S${season}E${episode}: ${rows.length} 条 subtitle_lines（${withZh} 条有中文）`
  );

  return { episode: episodeRow, lines: rows, aligned };
}

async function main() {
  const { season, episode } = parseSeasonEpisodeArgs();
  await ingestEpisode(season, episode);
}

if (process.argv[1]?.includes("seed-db")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
