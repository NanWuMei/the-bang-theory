/** 单条字幕 cue */
export interface SubtitleCue {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

/** 解析 SRT 时间戳 → 毫秒 */
export function parseSrtTimestamp(timestamp: string): number {
  const [hms, msPart] = timestamp.trim().split(",");
  const [hours, minutes, seconds] = hms.split(":").map(Number);
  const ms = Number(msPart);
  return hours * 3_600_000 + minutes * 60_000 + seconds * 1_000 + ms;
}

/** 清洗字幕文本 */
export function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\{\\[^}]+\}/g, "")
    .replace(/\r/g, "")
    .trim()
    .replace(/\n+/g, " ");
}

/** @deprecated 使用 cleanText */
export const normalizeSubtitleText = cleanText;

/**
 * 解析 SRT 文件内容为 SubtitleCue 数组
 * 跳过空块与无效时间轴
 */
export function parseSrt(content: string): SubtitleCue[] {
  const normalized = content.replace(/\uFEFF/g, "").replace(/\r\n/g, "\n");
  const blocks = normalized.split(/\n\n+/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    const timingIdx = lines.findIndex((l) => l.includes("-->"));
    if (timingIdx === -1) continue;

    const timingLine = lines[timingIdx];
    const match = timingLine.match(
      /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
    );
    if (!match) continue;

    const startMs = parseSrtTimestamp(match[1]);
    const endMs = parseSrtTimestamp(match[2]);
    if (endMs <= startMs) continue;

    const textLines = lines.slice(timingIdx + 1);
    const text = cleanText(textLines.join("\n"));
    if (!text) continue;

    const indexLine = timingIdx > 0 ? lines[0] : String(cues.length + 1);
    const index = Number.parseInt(indexLine, 10) || cues.length + 1;

    cues.push({ index, startMs, endMs, text });
  }

  return cues;
}
