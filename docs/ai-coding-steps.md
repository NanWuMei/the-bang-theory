# TBBT 台词素材平台 — AI Coding 实施步骤（11 步）

> **权威行动手册** · 供 Cursor 按步执行  
> 项目：`the-bang-theory` · Supabase：`dlkxlxtwszgrnxoctdgt`  
> 取代旧版 Phase 0–5 划分，统一按本文档推进

---

## 总览

```
Step 1  初始化项目          Step 7  视频播放 API
Step 2  创建数据库          Step 8  搜索页 UI
Step 3  准备素材            Step 9  素材篮 + 分享
Step 4  字幕处理脚本        Step 10 部署上线
Step 5  搜索 API            Step 11 MCP（可选）
Step 6  上传脚本 + Storage
```

---

## 当前进度快照

| 步骤 | 状态 | 说明 |
|------|------|------|
| **1 初始化项目** | 🟡 80% | Next.js 已有；**Tailwind 未装** |
| **2 创建数据库** | 🟡 50% | Supabase 项目已建；**SQL 未执行**；连接串待修 |
| **3 准备素材** | 🟡 30% | S01E01 MP4 + 双语 SRT 已有；**未上传 Storage** |
| **4 字幕脚本** | 🟡 70% | 函数已有，需按新命名对齐 |
| **5 搜索 API** | ⬜ 0% | 未开始 |
| **6–11** | ⬜ 0% | — |

---

## Step 1：初始化项目

### 目标
Next.js + Tailwind + 基础页面 + 环境变量

### 任务清单

- [x] 创建 Next.js 15 项目（`apps/web`）
- [x] Monorepo 结构（`packages/*`）
- [x] `.env.example` + `.env`
- [ ] **安装 Tailwind CSS + shadcn/ui**
- [ ] 基础页面结构：
  - `/` 搜索主页
  - `/share/[slug]` 分享页（空壳）
- [ ] 布局组件：`SearchBar` / `ResultList` / `ClipPlayer` / `MaterialBasket`（空壳）

### Cursor Prompt

```
按 docs/ai-coding-steps.md Step 1，给 apps/web 安装 Tailwind CSS，
创建搜索主页基础布局（深色主题），组件先空壳不接 API。
```

### 验收
`pnpm dev` 打开首页，有搜索框 + 左右分栏布局。

---

## Step 2：创建数据库

### 目标
Supabase PostgreSQL 建表 + 搜索索引 + 拿到可用连接串

### 任务清单

- [x] 注册 Supabase，创建项目
- [ ] **在 SQL Editor 执行** `supabase/sql/001_init.sql`
- [ ] 从 Dashboard → **Connect → Session pooler** 复制 URI 写入 `.env`
- [ ] 验证连接：`npx tsx scripts/ingest/test-db-connection.ts`

### 表结构（与你规划的命名一致）

| 表 | 用途 |
|----|------|
| `episodes` | 季/集元信息 + 视频 Storage object key |
| `subtitle_lines` | 双语字幕行（搜索主体） |
| `clip_cache` | 切片缓存状态（按需生成） |
| `share_snapshots` | 分享链接快照 |

### 搜索索引（建在 Supabase 内，不用 Meilisearch）

```sql
-- pg_trgm 模糊搜索（中英文台词）
CREATE INDEX subtitle_lines_text_en_trgm ON subtitle_lines USING GIN (text_en gin_trgm_ops);
CREATE INDEX subtitle_lines_text_zh_trgm ON subtitle_lines USING GIN (text_zh gin_trgm_ops);
```

### 连接串注意事项

| 问题 | 解决 |
|------|------|
| Direct 连接只有 IPv6 | 改用 **Session pooler** URI |
| 密码含 `!@#` | URL 编码（`!` → `%21`） |
| tenant not found | 从 Dashboard 复制完整 URI，不要手拼 region |

### Cursor Prompt

```
读取 supabase/sql/001_init.sql，帮我对照 Drizzle schema 是否一致，
并修复 packages/db 使表名改为 subtitle_lines。
```

### 验收
Supabase Table Editor 能看到 4 张表；`test-db-connection.ts` 输出 OK。

---

## Step 3：准备素材

### 目标
2–3 集合法片源 + 双语 SRT + 上传到 Supabase Storage

### MVP 范围（建议）

| 文件 | 状态 |
|------|------|
| S01E01 MP4 + EN/ZH SRT | ✅ 已有 |
| S01E02、S01E03 | ⬜ 可选扩展 |

### 目录规范

```
data/raw/
├── videos/s01e01.mp4
└── subtitles/
    ├── en/s01e01.srt
    └── zh/s01e01.srt
```

### Storage 规划（Supabase Storage，替代 MinIO/R2）

| Bucket | 路径 | 访问 |
|--------|------|------|
| `tbbt-videos` | `episodes/s01e01.mp4` | 私有，API 签名 URL |
| `tbbt-clips` | `clips/s01e01-0042.mp4` | 私有，按需缓存 |

### 任务清单

- [ ] Supabase Dashboard → Storage → 创建 bucket `tbbt-videos`
- [ ] 上传 S01E01.mp4 → 记录 object key：`episodes/s01e01.mp4`
- [ ] 写入 `episodes` 表：`season=1, episode=1, storage_key=episodes/s01e01.mp4`

### Cursor Prompt

```
按 Step 3 创建 scripts/media/upload-episode.ts，
用 Supabase Storage SDK 上传 data/raw/videos/s01e01.mp4，
并 insertEpisode() 写入数据库。
```

### 验收
Storage 控制台可见文件；`episodes` 表有 1 条记录。

---

## Step 4：编写字幕处理脚本

### 目标
解析 SRT → 双语对齐 → 写库 + 本地 JSON 备份

### 脚本模块映射

| 你规划的函数 | 当前文件 | 状态 |
|-------------|----------|------|
| `parseSrt()` | `scripts/ingest/parse-srt.ts` | ✅ |
| `alignSubtitles()` | `scripts/ingest/align-bilingual.ts` | ✅ 需改名导出 |
| `cleanText()` | `parse-srt.ts` → `normalizeSubtitleText()` | ✅ 需改名导出 |
| `insertEpisode()` | `seed-db.ts` | 🟡 需拆分 |
| `insertSubtitleLines()` | `seed-db.ts` | 🟡 需拆分 |

### 一键执行

```bash
pnpm ingest:pipeline --season 1 --episode 1
```

### 输出

| 输出 | 路径 |
|------|------|
| 本地 JSON 备份 | `data/processed/s01e01.subtitle_lines.json` |
| 数据库 | `episodes` + `subtitle_lines` 表 |

### Cursor Prompt

```
按 Step 4 重构 scripts/ingest/：
导出 parseSrt / alignSubtitles / cleanText / insertEpisode / insertSubtitleLines，
写入 subtitle_lines 表，保留 JSON 备份。
```

### 验收
S01E01 约 600 条 `subtitle_lines`；JSON 文件存在。

---

## Step 5：实现搜索 API

### 目标
`GET /api/search?q=关键词` → 查询 `subtitle_lines`

### API 契约

```
GET /api/search?q=bazinga&lang=both&season=1&limit=20

Response:
{
  "hits": [{
    "id": "s01e01-0042",
    "season": 1, "episode": 1,
    "start_ms": 125400, "end_ms": 128900,
    "text_en": "Bazinga!",
    "text_zh": "逗你玩！",
    "speaker": null
  }],
  "total": 15
}
```

### 查询实现（Supabase 内 pg_trgm）

```sql
SELECT * FROM subtitle_lines sl
JOIN episodes e ON sl.episode_id = e.id
WHERE sl.text_en ILIKE '%' || $1 || '%'
   OR sl.text_zh ILIKE '%' || $1 || '%'
ORDER BY sl.start_ms
LIMIT 20;
```

> MVP 用 ILIKE；数据量大后换 `pg_trgm` `%` 操作符。

### Cursor Prompt

```
按 Step 5 实现 apps/web/app/api/search/route.ts，
查 subtitle_lines 表，支持 lang=en|zh|both，返回 JSON。
```

### 验收
`curl "localhost:3000/api/search?q=soft+kitty"` 返回结果。

---

## Step 6：上传脚本 + Storage 集成

### 目标
视频/切片统一走 Supabase Storage，API 返回签名播放 URL

- [ ] `packages/media` 改用 `@supabase/supabase-js` Storage
- [ ] `GET /api/clips/:id/stream` 返回签名 URL
- [ ] 按需 ffmpeg 切片 → 上传 `tbbt-clips` bucket

### 验收
点击搜索结果能拿到可播放 URL（或 status: processing）。

---

## Step 7：视频播放 API

### 目标
按 `start_ms` / `end_ms` 播放片段

- [ ] 优先返回预切 clip；无则触发 worker 切片
- [ ] 前端 `ClipPlayer` seek 播放

---

## Step 8：搜索页 UI

### 目标
搜索框 + 结果列表 + 预览区 + 双语切换 + 关键词高亮

```
┌─────────────────────────────────────────────┐
│  [ 搜索框 ]              [ EN | 中 | 双语 ]  │
├──────────────────────┬──────────────────────┤
│  结果列表 (60%)       │  ClipPlayer (40%)    │
└──────────────────────┴──────────────────────┘
```

- [ ] debounce 300ms 调 `/api/search`
- [ ] 点击结果 → 加载 clip stream
- [ ] 空态 / 加载态 / 无结果态

---

## Step 9：素材篮 + 分享

- [ ] `useBasket` + localStorage
- [ ] `POST /api/share` → `/share/[slug]`
- [ ] 分享页只读列表

---

## Step 10：部署上线

| 组件 | 部署位置 |
|------|----------|
| Next.js | Vercel |
| 数据库 + Storage | Supabase（已有） |
| 切片 Worker | Railway / 单机 cron（可选） |

- [ ] 环境变量配置到 Vercel
- [ ] Supabase RLS 策略（bucket 私有 + API 签名）

---

## Step 11：MCP（可选）

供 Cursor 内直接搜台词：

```
tools: search_subtitle_lines, get_line_info
```

只读，不写库。

---

## 与旧版架构的差异

| 旧版 | 新版（你的思路） |
|------|-----------------|
| `dialogues` 表 | → `subtitle_lines` |
| Meilisearch 搜索 | → **Supabase pg_trgm / ILIKE** |
| MinIO 视频 | → **Supabase Storage** |
| 无 Tailwind | → **Tailwind + shadcn** |

---

## 你现在应该做什么（按顺序）

```
1. Step 2  打开 Supabase SQL Editor → 执行 supabase/sql/001_init.sql
2. Step 2  Dashboard Connect → 复制 Session pooler URI → 保存 .env
3. Step 2  npx tsx scripts/ingest/test-db-connection.ts  → 确认 OK
4. Step 4  pnpm ingest:pipeline --season 1 --episode 1
5. 回复「开始 Step 5」→ 实现搜索 API
```

---

## Cursor 协作约定

- 每次只做一个 Step，完成后再进下一步
- 引用格式：`按 docs/ai-coding-steps.md Step N 执行`
- 改表结构先更新 `supabase/sql/` 再改 Drizzle schema
- 不提交 `.env`、MP4、SRT
