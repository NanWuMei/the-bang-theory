import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, "../..");

export const PATHS = {
  subtitlesEn: (season: number, episode: number) =>
    join(
      ROOT,
      "data/raw/subtitles/en",
      `s${String(season).padStart(2, "0")}e${String(episode).padStart(2, "0")}.srt`
    ),
  subtitlesZh: (season: number, episode: number) =>
    join(
      ROOT,
      "data/raw/subtitles/zh",
      `s${String(season).padStart(2, "0")}e${String(episode).padStart(2, "0")}.srt`
    ),
  processed: (season: number, episode: number) =>
    join(
      ROOT,
      "data/processed",
      `s${String(season).padStart(2, "0")}e${String(episode).padStart(2, "0")}.subtitle_lines.json`
    ),
  processedDir: () => join(ROOT, "data/processed"),
};

export function parseSeasonEpisodeArgs() {
  const args = process.argv.slice(2);
  let season = 1;
  let episode = 1;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--season") season = Number(args[++i]);
    if (args[i] === "--episode") episode = Number(args[++i]);
  }
  return { season, episode };
}

export function loadEnv() {
  config({ path: join(ROOT, ".env") });
  config({ path: join(ROOT, "apps/web/.env.local") });
}
