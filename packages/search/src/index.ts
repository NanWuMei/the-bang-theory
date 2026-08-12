import { MeiliSearch } from "meilisearch";

export const DIALOGUES_INDEX = "dialogues";

export function getMeiliClient() {
  const host = process.env.MEILI_HOST ?? "http://localhost:7700";
  const apiKey = process.env.MEILI_MASTER_KEY ?? "dev-master-key";
  return new MeiliSearch({ host, apiKey });
}

export interface DialogueHit {
  id: string;
  season: number;
  episode: number;
  start_ms: number;
  end_ms: number;
  text_en: string;
  text_zh?: string;
  speaker?: string;
}

export interface SearchOptions {
  lang?: "en" | "zh" | "both";
  season?: number;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  hits: DialogueHit[];
  total: number;
  processingTimeMs: number;
}

/** Phase 2 实现：Meilisearch 全文检索 */
export async function searchDialogues(
  _query: string,
  _opts: SearchOptions = {}
): Promise<SearchResult> {
  return { hits: [], total: 0, processingTimeMs: 0 };
}
