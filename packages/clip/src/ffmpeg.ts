import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { ffmpegPath } from "./paths";

const exec = promisify(execFile);

function msToFfmpegTime(ms: number) {
  const sec = Math.max(0, ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
}

export async function extractThumbnail(
  sourceVideo: string,
  atMs: number,
  outputJpg: string
) {
  await mkdir(dirname(outputJpg), { recursive: true });
  const ss = msToFfmpegTime(atMs);
  await exec(ffmpegPath(), [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    ss,
    "-i",
    sourceVideo,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    "-y",
    outputJpg,
  ]);
}

export async function cutClip(
  sourceVideo: string,
  startMs: number,
  endMs: number,
  outputMp4: string
) {
  await mkdir(dirname(outputMp4), { recursive: true });
  const ss = msToFfmpegTime(startMs);
  const to = msToFfmpegTime(endMs);

  try {
    await exec(ffmpegPath(), [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      ss,
      "-to",
      to,
      "-i",
      sourceVideo,
      "-c",
      "copy",
      "-avoid_negative_ts",
      "make_zero",
      "-y",
      outputMp4,
    ]);
  } catch {
    await exec(ffmpegPath(), [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      ss,
      "-to",
      to,
      "-i",
      sourceVideo,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      "-y",
      outputMp4,
    ]);
  }
}
