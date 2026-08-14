# Supabase 数据库配置

> 项目 Dashboard：https://supabase.com/dashboard/project/dlkxlxtwszgrnxoctdgt  
> Project Ref：`dlkxlxtwszgrnxoctdgt`

元数据（episodes / dialogues / clips / shares）存储在 **Supabase PostgreSQL**。  
搜索索引（Meilisearch）、队列（Redis）、视频（MinIO）仍在本地 Docker，后续可将视频迁至 Supabase Storage。

---

## 1. 获取数据库密码

1. 打开 [Project Settings → Database](https://supabase.com/dashboard/project/dlkxlxtwszgrnxoctdgt/settings/database)
2. 若忘记密码，可 **Reset database password** 并保存新密码

---

## 2. 复制连接字符串（必须用 Session pooler）

打开 **Connect** 面板：

https://supabase.com/dashboard/project/dlkxlxtwszgrnxoctdgt?showConnect=true

| 选哪种 | 说明 |
|--------|------|
| ✅ **Session pooler** | 主机含 `pooler.supabase.com`，IPv4 可用 |
| ❌ Direct connection | 主机是 `db.xxx.supabase.co`，仅 IPv6，家用网常连不上 |

**格式示例**（region 必须从 Dashboard 复制，可能是 aws-0 或 aws-1）：

```
postgresql://postgres.dlkxlxtwszgrnxoctdgt:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

- 用户名必须是 `postgres.dlkxlxtwszgrnxoctdgt`（**不是** `postgres`）
- 主机名不要手拼，从 Dashboard 整段复制

---

## 3. 写入 `.env`

```env
DATABASE_URL=postgresql://postgres.dlkxlxtwszgrnxoctdgt:你的密码@aws-XX-区域.pooler.supabase.com:5432/postgres
DATABASE_SSL=true
```

> ⚠️ 不要把含密码的 `.env` 提交到 Git。

---

## 4. 建表 + 入库

```bash
pnpm db:migrate
pnpm ingest:pipeline --season 1 --episode 1
```

在 Supabase **Table Editor** 中应能看到：
- `episodes`
- `dialogues`
- `clips`
- `shares`

---

## 5. 本地 Docker（不含 Postgres）

```bash
docker compose up -d
```

仅启动 Meilisearch、Redis、MinIO。若要用本地 Postgres 调试：

```bash
docker compose --profile local-db up -d
# DATABASE_URL=postgresql://tbbt:tbbt@localhost:5432/tbbt
```

---

## 6. 后续：Supabase Storage（Phase 3 可选）

视频文件可迁至 Supabase Storage，替代 MinIO，与数据库同一项目统一管理。  
届时 `MINIO_*` 将换为 Supabase S3 兼容 endpoint，Phase 3 再实现。
