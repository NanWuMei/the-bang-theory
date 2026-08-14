import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { searchSubtitleLines } from "../../packages/search/src/index.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: join(root, ".env") });

async function main() {
  for (const q of ["photon", "soft kitty", "bazinga", "逗你"]) {
    const r = await searchSubtitleLines(q, { limit: 3 });
    console.log(q, "→", r.total, "hits", r.hits[0]?.text_en?.slice(0, 60));
  }
}

main().catch(console.error);
