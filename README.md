# TBBT 台词素材检索

搜索《生活大爆炸》双语台词，预览视频片段，分享素材。

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动基础设施

```bash
docker compose up -d
cp .env.example .env.local   # apps/web 会自动读取根目录 .env
```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000 ，健康检查 http://localhost:3000/api/health

## 项目结构

```
apps/web/          Next.js 前端 + API Routes
packages/db/       Drizzle ORM + PostgreSQL schema
packages/search/   Meilisearch 搜索
packages/clip/     ffmpeg 按需切片
packages/media/    MinIO S3 客户端
packages/share/    分享快照
docs/              实现手册
```

## 文档

详细实现计划见 [docs/implementation-handbook.md](docs/implementation-handbook.md)

## 服务端口

| 服务 | 端口 |
|------|------|
| Web | 3000 |
| PostgreSQL | 5432 |
| Meilisearch | 7700 |
| Redis | 6379 |
| MinIO API | 9000 |
| MinIO Console | 9001 |
