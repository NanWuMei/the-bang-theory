# Phase 1 scripts will be added here:
# - parse-srt.ts       ✓
# - align-bilingual.ts ✓
# - seed-db.ts         ✓
# - sync-meili.ts      ✓
# - pipeline.ts        ✓

## 一键入库

```bash
# 1. 配置 Supabase DATABASE_URL → 见 docs/supabase-setup.md
# 2. 本地 Docker（Meilisearch / Redis / MinIO，不含 Postgres）
docker compose up -d
pnpm install
pnpm db:migrate
pnpm ingest:pipeline --season 1 --episode 1
```
