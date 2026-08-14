import { access, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  VIDEOS_BUCKET,
  episodeKey,
  isStorageConfigured,
  uploadLocalFile,
} from "@tbbt/media";
import { insertEpisode } from "../ingest/seed-db.js";
import { loadEnv, parseSeasonEpisodeArgs, ROOT } from "../ingest/utils.js";

loadEnv();

async function main() {
  const { season, episode } = parseSeasonEpisodeArgs();
  const videoName = `s${String(season).padStart(2, "0")}e${String(episode).padStart(2, "0")}.mp4`;
  const localPath = join(ROOT, "data/raw/videos", videoName);
  const key = episodeKey(season, episode);

  if (!isStorageConfigured()) {
    console.error(
      "缺少 Supabase Storage 配置。请在 .env 添加：\n" +
        "  SUPABASE_URL=https://dlkxlxtwszgrnxoctdgt.supabase.co\n" +
        "  SUPABASE_SERVICE_ROLE_KEY=（Dashboard → Settings → API → service_role）\n" +
        "并在 Supabase Storage 创建私有 bucket：tbbt-videos、tbbt-clips"
    );
    process.exit(1);
  }

  try {
    await access(localPath);
  } catch {
    console.error(`本地视频不存在: ${localPath}`);
    process.exit(1);
  }

  const info = await stat(localPath);
  console.log(`上传 ${localPath} (${(info.size / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`→ ${VIDEOS_BUCKET}/${key}`);

  await uploadLocalFile(VIDEOS_BUCKET, key, localPath, "video/mp4");
  const row = await insertEpisode(season, episode, key);

  console.log(`✓ 已上传并写入 episodes 表 (id=${row.id}, storage_key=${key})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
