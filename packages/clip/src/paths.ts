import { join, dirname } from "path";
import { fileURLToPath } from "url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
export const MONOREPO_ROOT = join(packageRoot, "../..");

export function localVideosDir() {
  return process.env.LOCAL_VIDEOS_DIR ?? join(MONOREPO_ROOT, "data/raw/videos");
}

export function cacheDir() {
  return process.env.MEDIA_CACHE_DIR ?? join(MONOREPO_ROOT, "data/cache");
}

export function clipCachePath(lineId: string) {
  return join(cacheDir(), "clips", `${lineId}.mp4`);
}

export function thumbCachePath(lineId: string) {
  return join(cacheDir(), "thumbs", `${lineId}.jpg`);
}

export function episodeVideoPath(season: number, episode: number) {
  const name = `s${String(season).padStart(2, "0")}e${String(episode).padStart(2, "0")}.mp4`;
  return join(localVideosDir(), name);
}

export function clipPaddingMs() {
  return Number(process.env.CLIP_PADDING_MS ?? 200);
}

export function ffmpegPath() {
  return process.env.FFMPEG_PATH ?? "ffmpeg";
}

/** API 相对路径 */
export function clipStorageKey(lineId: string) {
  return `clips/${lineId}.mp4`;
}

export function thumbStorageKey(lineId: string) {
  return `thumbs/${lineId}.jpg`;
}
