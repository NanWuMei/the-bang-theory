import { and, count, eq, ilike, or, type SQL } from "drizzle-orm";
import { getDb, schema } from "@tbbt/db";

export interface SubtitleLineHit {
  id: string;
  season: number;
  episode: number;
  start_ms: number;
  end_ms: number;
  text_en: string;
  text_zh?: string | null;
  speaker?: string | null;
  highlight?: {
    text_en?: string;
    text_zh?: string;
  };
}

/** @deprecated */
export type DialogueHit = SubtitleLineHit;

export interface SearchOptions {
  lang?: "en" | "zh" | "both";
  season?: number;
  episode?: number;
  limit?: number;
  offset?: number;
}

/** 当前仅支持 S01E01 */
export const DEFAULT_SEASON = 1;
export const DEFAULT_EPISODE = 1;

export interface SearchResult {
  hits: SubtitleLineHit[];
  total: number;
  processingTimeMs: number;
}

function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

function buildTextConditions(
  query: string,
  lang: "en" | "zh" | "both"
): SQL | undefined {
  const pattern = `%${escapeIlike(query)}%`;
  const parts: SQL[] = [];

  if (lang === "en" || lang === "both") {
    parts.push(ilike(schema.subtitleLines.enText, pattern));
  }
  if (lang === "zh" || lang === "both") {
    parts.push(ilike(schema.subtitleLines.zhText, pattern));
  }

  return parts.length === 1 ? parts[0] : or(...parts);
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(
    new RegExp(`(${escaped})`, "gi"),
    "<em>$1</em>"
  );
}

/** 搜索 subtitle_lines（Supabase PostgreSQL + ILIKE） */
export async function searchSubtitleLines(
  query: string,
  opts: SearchOptions = {}
): Promise<SearchResult> {
  const start = Date.now();
  const trimmed = query.trim();
  if (!trimmed) {
    return { hits: [], total: 0, processingTimeMs: 0 };
  }

  const lang = opts.lang ?? "both";
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);

  const textCond = buildTextConditions(trimmed, lang);
  const season = opts.season ?? DEFAULT_SEASON;
  const episode = opts.episode ?? DEFAULT_EPISODE;

  const whereClause = and(
    textCond,
    eq(schema.episodes.season, season),
    eq(schema.episodes.episode, episode)
  );

  const db = getDb();

  const [totalRow] = await db
    .select({ value: count() })
    .from(schema.subtitleLines)
    .innerJoin(
      schema.episodes,
      eq(schema.subtitleLines.episodeId, schema.episodes.id)
    )
    .where(whereClause);

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
    .where(whereClause)
    .orderBy(schema.subtitleLines.startMs)
    .limit(limit)
    .offset(offset);

  const hits: SubtitleLineHit[] = rows.map((row) => ({
    ...row,
    highlight: {
      text_en: highlightText(row.text_en, trimmed),
      ...(row.text_zh
        ? { text_zh: highlightText(row.text_zh, trimmed) }
        : {}),
    },
  }));

  return {
    hits,
    total: totalRow?.value ?? 0,
    processingTimeMs: Date.now() - start,
  };
}

export { searchRandomLines } from "./random";

/** @deprecated 使用 searchSubtitleLines */
export const searchDialogues = searchSubtitleLines;
