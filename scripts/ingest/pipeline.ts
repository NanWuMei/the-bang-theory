import { mkdir, writeFile, readFile } from "fs/promises";
import { alignSubtitles } from "./align-bilingual";
import { parseSrt } from "./parse-srt";
import { ingestEpisode } from "./seed-db";
import { PATHS, parseSeasonEpisodeArgs, loadEnv } from "./utils";

loadEnv();

async function main() {
  const { season, episode } = parseSeasonEpisodeArgs();
  console.log(`\n=== TBBT 语料入库 S${season}E${episode} ===\n`);

  const [enRaw, zhRaw] = await Promise.all([
    readFile(PATHS.subtitlesEn(season, episode), "utf-8"),
    readFile(PATHS.subtitlesZh(season, episode), "utf-8"),
  ]);

  const aligned = alignSubtitles(parseSrt(enRaw), parseSrt(zhRaw));

  await mkdir(PATHS.processedDir(), { recursive: true });
  const jsonPath = PATHS.processed(season, episode);
  await writeFile(
    jsonPath,
    JSON.stringify({ season, episode, subtitle_lines: aligned }, null, 2),
    "utf-8"
  );
  console.log(`✓ JSON 备份 → ${jsonPath}`);

  await ingestEpisode(season, episode);

  console.log("\n=== 完成（搜索索引在 Supabase pg_trgm，无需 Meilisearch）===\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
