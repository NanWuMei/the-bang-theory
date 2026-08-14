import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getPostgresClientOptions } from "./connection";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function ensureEnv() {
  if (process.env.DATABASE_URL) return;
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
  config({ path: join(root, ".env") });
  config({ path: join(root, "apps/web/.env.local") });
}

export function getDb() {
  if (!db) {
    ensureEnv();
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    client = postgres(url, getPostgresClientOptions(url));
    db = drizzle(client, { schema });
  }
  return db;
}

export { schema };
export * from "./schema";
export * from "./connection";
