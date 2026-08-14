import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@tbbt/db";
import {
  DIALOGUES_INDEX,
  getMeiliClient,
  type DialogueHit,
} from "@tbbt/search";
import { loadEnv, parseSeasonEpisodeArgs } from "./utils";

loadEnv();

const INDEX_SETTINGS = {
  searchableAttributes: ["text_en", "text_zh"],
  filterableAttributes: ["season", "episode", "speaker"],
  sortableAttributes: ["season", "episode", "start_ms"],
};

export async function syncEpisodeToMeili(season: number, episode: number) {
  const db = getDb();
  const client = getMeiliClient();
  const index = client.index(DIALOGUES_INDEX);

  try {
    await index.getRawInfo();
  } catch {
    await client.createIndex(DIALOGUES_INDEX, { primaryKey: "id" });
  }

  await index.updateSettings(INDEX_SETTINGS);

  const [episodeRow] = await db
    .select()
    .from(schema.episodes)
    .where(
      and(
        eq(schema.episodes.season, season),
        eq(schema.episodes.episode, episode)
      )
    )
    .limit(1);

  if (!episodeRow) {
    throw new Error(`Episode S${season}E${episode} not found — run seed-db first`);
  }

  const dialogues = await db
    .select()
    .from(schema.dialogues)
    .where(eq(schema.dialogues.episodeId, episodeRow.id));

  const docs: DialogueHit[] = dialogues.map((d) => ({
    id: d.id,
    season,
    episode,
    start_ms: d.startMs,
    end_ms: d.endMs,
    text_en: d.textEn,
    text_zh: d.textZh ?? undefined,
    speaker: d.speaker ?? undefined,
  }));

  if (docs.length === 0) {
    console.warn("无台词可同步");
    return;
  }

  const task = await index.addDocuments(docs, { primaryKey: "id" });
  console.log(
    `✓ Meilisearch 同步 S${season}E${episode}: ${docs.length} 条 (task ${task.taskUid})`
  );
}

async function main() {
  const { season, episode } = parseSeasonEpisodeArgs();
  await syncEpisodeToMeili(season, episode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
