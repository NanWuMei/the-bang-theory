/**
 * 从 OpenSubtitles 下载 TBBT 指定季集的字幕（英/中）
 *
 * 用法:
 *   pnpm ingest:download-subtitles --season 1 --episode 1
 *
 * 需要环境变量:
 *   OPENSUBTITLES_API_KEY
 *   OPENSUBTITLES_USERNAME
 *   OPENSUBTITLES_PASSWORD
 */

import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const TBBT_IMDB = "0898266"; // tt0898266
const API_BASE = "https://api.opensubtitles.com/api/v1";
const APP_NAME = "tbbt-quotes";
const APP_VERSION = "0.1.0";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const SUBS_DIR = join(ROOT, "data/raw/subtitles");

const LANG_MAP: Record<string, string> = {
  en: "en",
  zh: "zh-cn",
};

function parseArgs() {
  const args = process.argv.slice(2);
  let season = 1;
  let episode = 1;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--season") season = Number(args[++i]);
    if (args[i] === "--episode") episode = Number(args[++i]);
  }
  return { season, episode };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`缺少环境变量 ${name}，见 data/raw/README.md`);
  return v;
}

async function login(): Promise<string> {
  const apiKey = requireEnv("OPENSUBTITLES_API_KEY");
  const username = requireEnv("OPENSUBTITLES_USERNAME");
  const password = requireEnv("OPENSUBTITLES_PASSWORD");

  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
      "User-Agent": `${APP_NAME} v${APP_VERSION}`,
    },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`登录失败 ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { token: string };
  return json.token;
}

async function searchSubtitle(
  token: string,
  season: number,
  episode: number,
  lang: string
) {
  const apiKey = requireEnv("OPENSUBTITLES_API_KEY");
  const params = new URLSearchParams({
    parent_imdb_id: TBBT_IMDB,
    season_number: String(season),
    episode_number: String(episode),
    languages: lang,
  });

  const res = await fetch(`${API_BASE}/subtitles?${params}`, {
    headers: {
      "Api-Key": apiKey,
      Authorization: `Bearer ${token}`,
      "User-Agent": `${APP_NAME} v${APP_VERSION}`,
    },
  });

  if (!res.ok) {
    throw new Error(`搜索字幕失败 ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as {
    data: Array<{ attributes: { files: Array<{ file_id: number }> } }>;
  };

  const fileId = json.data?.[0]?.attributes?.files?.[0]?.file_id;
  if (!fileId) {
    throw new Error(`未找到 S${season}E${episode} ${lang} 字幕`);
  }
  return fileId;
}

async function downloadSubtitleFile(
  token: string,
  fileId: number
): Promise<string> {
  const apiKey = requireEnv("OPENSUBTITLES_API_KEY");

  const res = await fetch(`${API_BASE}/download`, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": `${APP_NAME} v${APP_VERSION}`,
    },
    body: JSON.stringify({ file_id: fileId }),
  });

  if (!res.ok) {
    throw new Error(`下载请求失败 ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { link: string };
  const fileRes = await fetch(json.link);
  if (!fileRes.ok) {
    throw new Error(`获取字幕文件失败 ${fileRes.status}`);
  }
  return fileRes.text();
}

function episodeFileName(season: number, episode: number) {
  return `s${String(season).padStart(2, "0")}e${String(episode).padStart(2, "0")}.srt`;
}

async function main() {
  const { season, episode } = parseArgs();
  console.log(`下载 TBBT S${season}E${episode} 字幕...`);

  const token = await login();

  for (const [folder, lang] of Object.entries(LANG_MAP)) {
    await new Promise((r) => setTimeout(r, 1100)); // API rate limit 1 req/s
    const fileId = await searchSubtitle(token, season, episode, lang);
    await new Promise((r) => setTimeout(r, 1100));
    const content = await downloadSubtitleFile(token, fileId);

    const outDir = join(SUBS_DIR, folder);
    await mkdir(outDir, { recursive: true });
    const outPath = join(outDir, episodeFileName(season, episode));
    await writeFile(outPath, content, "utf-8");
    console.log(`✓ 已保存 ${outPath}`);
  }

  console.log("\n完成！可以继续 Phase 1 语料入库。");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
