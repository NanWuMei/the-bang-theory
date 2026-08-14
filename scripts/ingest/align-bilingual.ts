import type { SubtitleCue } from "./parse-srt";

export interface AlignedDialogue {
  lineIndex: number;
  startMs: number;
  endMs: number;
  textEn: string;
  textZh: string | null;
}

/**
 * 英中字幕按 start_ms 最近邻对齐
 * - 默认容差 800ms，可通过环境变量 ALIGN_TOLERANCE_MS 调整
 * - 优先匹配未被使用的中文 cue，避免重复对齐
 */
export function alignBilingual(
  enCues: SubtitleCue[],
  zhCues: SubtitleCue[],
  toleranceMs = Number(process.env.ALIGN_TOLERANCE_MS ?? 800)
): AlignedDialogue[] {
  const usedZh = new Set<number>();

  return enCues.map((enCue, i) => {
    let bestUnused: { idx: number; cue: SubtitleCue; diff: number } | null =
      null;
    let bestAny: { idx: number; cue: SubtitleCue; diff: number } | null = null;

    zhCues.forEach((zhCue, idx) => {
      const diff = Math.abs(enCue.startMs - zhCue.startMs);
      if (diff > toleranceMs) return;

      const candidate = { idx, cue: zhCue, diff };
      if (!bestAny || diff < bestAny.diff) bestAny = candidate;
      if (!usedZh.has(idx) && (!bestUnused || diff < bestUnused.diff)) {
        bestUnused = candidate;
      }
    });

    const matched = bestUnused ?? bestAny;
    if (matched) usedZh.add(matched.idx);

    return {
      lineIndex: i + 1,
      startMs: enCue.startMs,
      endMs: enCue.endMs,
      textEn: enCue.text,
      textZh: matched?.cue.text ?? null,
    };
  });
}

/** @deprecated 使用 subtitleLineId */
export const dialogueId = subtitleLineId;

export function subtitleLineId(
  season: number,
  episode: number,
  lineIndex: number
): string {
  return `s${String(season).padStart(2, "0")}e${String(episode).padStart(2, "0")}-${String(lineIndex).padStart(4, "0")}`;
}

/** 英中字幕按 start_ms 最近邻对齐（alignSubtitles 别名） */
export function alignSubtitles(
  enCues: SubtitleCue[],
  zhCues: SubtitleCue[],
  toleranceMs = Number(process.env.ALIGN_TOLERANCE_MS ?? 800)
): AlignedDialogue[] {
  return alignBilingual(enCues, zhCues, toleranceMs);
}