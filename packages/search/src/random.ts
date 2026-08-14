import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@tbbt/db";
import type { SubtitleLineHit } from "./index";

/** 随机推荐字幕行 */
export async function searchRandomLines(
  limit = 9
): Promise<SubtitleLineHit[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: schema.subtitleLines.id,
      season: schema.episodes.season,
      episode: schema.episodes.episode,
      start_ms: schema.subtitleLines.startMs,
      end_ms: schema.subtitleLines.endMs,
      text_en: schema.subtitleLines.enText,
      text_zh: schema.subtitleLines.zhText,
      speaker: schema.subtitleLines.speaker,
    })
    .from(schema.subtitleLines)
    .innerJoin(
      schema.episodes,
      eq(schema.subtitleLines.episodeId, schema.episodes.id)
    )
    .where(and(eq(schema.episodes.season, 1), eq(schema.episodes.episode, 1)))
    .orderBy(sql`random()`)
    .limit(limit);

  return rows;
}
