import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "drizzle-kit";
import { getDrizzleDbCredentials } from "./src/connection";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: join(root, ".env") });
config({ path: join(root, "apps/web/.env.local") });

const url =
  process.env.DATABASE_URL ??
  "postgresql://tbbt:tbbt@localhost:5432/tbbt";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: getDrizzleDbCredentials(url),
});
