# 《生活大爆炸》台词素材检索平台 — AI Coding 实现手册

> **文档版本**: v1.0  
> **更新日期**: 2026-08-12  
> **适用场景**: 供 Cursor / AI Agent 按模块逐步实现  
> **MVP 目标**: 关键词搜索双语台词 → 预览片段 → 加入素材篮 → 生成可分享链接

---

## 目录

1. [项目概览与 MVP 边界](#1-项目概览与-mvp-边界)
2. [模块化架构设计](#2-模块化架构设计)
3. [语料库建设方案](#3-语料库建设方案)
4. [数据存储与成本方案](#4-数据存储与成本方案)
5. [前端设计（MVP）](#5-前端设计mvp)
6. [后端 API 与数据流转](#6-后端-api-与数据流转)
7. [分阶段实现计划（AI Coding 行动清单）](#7-分阶段实现计划ai-coding-行动清单)
8. [部署方案（低成本可实施）](#8-部署方案低成本可实施)
9. [Cursor 协作规范](#9-cursor-协作规范)
10. [附录](#10-附录)

---

## 1. 项目概览与 MVP 边界

### 1.1 产品一句话

用户输入英文/中文关键词，检索《生活大爆炸》(The Big Bang Theory, TBBT) 台词，在线预览对应视频片段，选中多条素材后生成分享页。

### 1.2 MVP 功能边界

| 功能 | MVP 包含 | MVP 不包含（后续迭代） |
|------|----------|------------------------|
| 关键词搜索 | ✅ 英/中双语 | ❌ 语义搜索、AI 改写 |
| 搜索结果 | ✅ 列表 + 高亮 + 季/集/角色 | ❌ 高级筛选面板 |
| 片段预览 | ✅ 在线播放（seek 到时间戳） | ❌ GIF 导出 |
| 素材篮 | ✅ 多选、排序、删除 | ❌ 跨设备同步账号 |
| 分享 | ✅ 分享链接（只读页面） | ❌ 社交一键分享、短链 |
| 视频切片 | ✅ **按需生成** + MinIO 缓存 | ❌ 全量预切片 |
| 用户系统 | ❌ | ✅ 注册/收藏/历史 |
| MCP 接口 | ✅ 只读搜索 MCP（Phase 5） | ❌ 写入类 MCP |

### 1.3 非功能需求

- 首次搜索响应 < 500ms（索引命中）
- 片段首次加载 < 3s（缓存命中 < 1s）
- 单机部署可支撑 10 并发预览（MVP 阶段）
- 语料元数据全部入库，媒体文件不进 Git

---

## 2. 模块化架构设计

### 2.1 总体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Layer 客户端层                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │  SearchPage  │  │ ClipPlayer   │  │ SharePage    │                   │
│  │  搜索主页     │  │ 片段播放器    │  │ 分享只读页    │                   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                   │
│         │                 │                 │                            │
│         └────────────────┼─────────────────┘                            │
│                          │ REST / tRPC                                   │
└──────────────────────────┼──────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        API Gateway  api/ (Next.js Route Handlers)         │
│  GET /api/search?q=     GET /api/clips/:id     POST /api/share           │
│  GET /api/clips/:id/stream (签名 URL 302 重定向)                          │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ SearchModule  │  │  ClipModule   │  │ ShareModule   │
│ 搜索模块       │  │  片段模块      │  │ 分享模块       │
│               │  │               │  │               │
│ Meilisearch   │  │ ffmpeg worker │  │ slug 生成     │
│ 全文索引       │  │ 按需切片       │  │ 分享快照       │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Data Layer 数据层                                     │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐  │
│  │ PostgreSQL  │   │  MinIO      │   │ Meilisearch │   │ Redis       │  │
│  │ 元数据/关系   │   │  媒体对象存储 │   │  搜索索引    │   │ 任务队列/缓存│  │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                           ▲
                           │ 离线 ETL（一次性 + 增量）
┌──────────────────────────┴──────────────────────────────────────────────┐
│                     Ingest Module 语料入库模块                              │
│  scripts/ingest/  解析 SRT → 对齐双语 → 写 PG → 同步 Meilisearch          │
│  scripts/media/   上传原片 MP4 → MinIO episodes/                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     MCP Server（Phase 5，可选）                             │
│  tools: search_dialogues, get_clip_info                                   │
│  供 Cursor 内直接检索台词，只读，不走前端                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 模块清单（代价 / 职责 / 依赖）

> **「代价」** = 该模块的开发复杂度、运维成本、资源占用（低/中/高）

| 模块 ID | 名称 | 职责 | 开发代价 | 运维代价 | 依赖 |
|---------|------|------|----------|----------|------|
| **M1** | `IngestModule` | 字幕解析、双语对齐、批量入库 | 中 | 低（离线跑） | SRT 原文件 |
| **M2** | `MediaModule` | 原片/切片上传 MinIO，路径管理 | 低 | 中（存储空间） | MinIO |
| **M3** | `MetaStore` | PG 表结构、CRUD、片段关系 | 中 | 低 | PostgreSQL |
| **M4** | `SearchModule` | 全文检索、排序、高亮 | 中 | 低 | Meilisearch, M3 |
| **M5** | `ClipModule` | 按需 ffmpeg 切片、缓存、流式 URL | 高 | 中（CPU 峰值） | M2, M3, Redis |
| **M6** | `ShareModule` | 分享快照、短 slug、只读页数据 | 低 | 低 | M3 |
| **M7** | `WebUI` | 搜索页、播放器、素材篮、分享页 | 中 | 低 | M4, M5, M6 |
| **M8** | `MCPServer` | Cursor 工具：搜索台词 | 低 | 低 | M4 |

### 2.3 各模块内部结构（带注释）

#### M1 — IngestModule `scripts/ingest/`

```
scripts/ingest/
├── parse-srt.ts          # 解析单个 SRT → { start_ms, end_ms, text, index }
├── align-bilingual.ts    # 英中字幕按时间戳对齐（±500ms 窗口匹配）
├── normalize.ts          # 清洗 HTML 标签、合并连续短句
├── seed-db.ts            # 写入 PostgreSQL dialogues 表
├── sync-meili.ts         # 推送/更新 Meilisearch 索引
└── pipeline.ts           # 一键执行：raw → db → meili
```

**注释**：
- 对齐策略：优先精确匹配 `start_ms`；失败则用最近邻 + 文本长度比校验
- 一条 dialogue 对应一句字幕，不跨句合并（MVP 保证 seek 精准）

#### M2 — MediaModule `packages/media/`

```
packages/media/
├── minio-client.ts       # S3 兼容客户端封装
├── upload-episode.ts     # 上传整集 MP4 → episodes/s{season}e{episode}.mp4
├── clip-path.ts          # 生成对象 Key：clips/{dialogue_id}.mp4
└── presign-url.ts        # 生成带过期时间的预签名 URL（前端播放用）
```

**注释**：
- **原片**存 `episodes/` 前缀，**切片**存 `clips/` 前缀
- 切片不存在时由 M5 触发 ffmpeg 从原片裁切后上传

#### M3 — MetaStore `packages/db/`

```
packages/db/
├── schema.prisma         # ORM 模型（或 drizzle schema）
├── migrations/
└── repositories/
    ├── dialogue.repo.ts  # 台词 CRUD
    ├── clip.repo.ts      # 切片状态：pending | ready | failed
    └── share.repo.ts     # 分享快照
```

#### M4 — SearchModule `packages/search/`

```
packages/search/
├── meili-client.ts
├── index-config.ts       # searchable: text_en, text_zh; filterable: season, speaker
└── search.ts             # search(q, opts) → ranked results + highlights
```

#### M5 — ClipModule `packages/clip/`

```
packages/clip/
├── ffmpeg-cut.ts         # 从原片按 start/end 切 mp4（-ss -to -c copy 优先）
├── job-queue.ts          # Redis 队列：clip:generate:{dialogue_id}
├── worker.ts             # 消费队列 → 切片的 → 上传 MinIO → 更新 PG
└── get-stream-url.ts     # 命中缓存直接 presign；未命中入队 + 返回等待状态
```

**注释**：
- MVP 用 **`-c copy`**（不重编码）降低 CPU；切点不准时再 fallback 重编码
- 前端轮询 `GET /api/clips/:id/status` 直到 `ready`

#### M6 — ShareModule `packages/share/`

```
packages/share/
├── create-share.ts       # 接收 dialogue_id[] → 生成 share slug
└── get-share.ts          # slug → 分享快照（台词 + clip 引用）
```

#### M7 — WebUI `apps/web/`

```
apps/web/
├── app/
│   ├── page.tsx              # 搜索主页
│   ├── share/[slug]/page.tsx # 分享页
│   └── api/                  # Route Handlers（薄层，调 packages）
├── components/
│   ├── SearchBar.tsx
│   ├── ResultList.tsx
│   ├── ResultItem.tsx
│   ├── ClipPlayer.tsx
│   ├── MaterialBasket.tsx    # 素材篮 Drawer
│   └── BilingualToggle.tsx
├── hooks/
│   ├── useSearch.ts
│   ├── useBasket.ts          # localStorage 持久化
│   └── useClipStream.ts
└── lib/
    └── api-client.ts
```

#### M8 — MCPServer `packages/mcp-server/`（Phase 5）

```
packages/mcp-server/
├── index.ts              # MCP stdio server 入口
└── tools/
    ├── search_dialogues.ts   # input: query, lang? → 返回 TOP N 台词
    └── get_clip_info.ts      # input: dialogue_id → 季集/时间/文本
```

**注释**：MCP 只做**只读检索**，不触发切片、不写库，避免 Cursor 误操作。

### 2.4 技术栈锁定

| 层级 | 选型 | 理由 |
|------|------|------|
| 单体应用 | **Next.js 15 (App Router)** | 前后端一体，Route Handlers 作 API |
| 语言 | TypeScript | AI Coding 友好 |
| ORM | **Drizzle** 或 Prisma | 类型安全 |
| 数据库 | **PostgreSQL 16** | 关系查询、JSON 字段 |
| 搜索 | **Meilisearch 1.x** | 轻量、中文友好、部署简单 |
| 对象存储 | **MinIO**（自建 S3） | 零许可费，与 AWS SDK 兼容 |
| 队列/缓存 | **Redis 7** | 切片任务队列 + 热点缓存 |
| 媒体处理 | **ffmpeg**（静态二进制） | 按需切片 |
| 容器 | **Docker Compose** | 一键本地/生产 |
| UI | Tailwind + shadcn/ui | 快速 MVP |

---

## 3. 语料库建设方案

### 3.1 数据资产清单

| 资产 | 格式 | 数量（全剧） | 用途 |
|------|------|-------------|------|
| 原始字幕 EN | `.srt` | 12 季 × ~24 集 | 英文台词 + 时间轴 |
| 原始字幕 ZH | `.srt` | 同上（需匹配集） | 中文对照 |
| 原始视频 | `.mp4` (H.264/AAC) | ~279 集 | seek 播放 + 切片源 |
| 结构化台词 | DB 行 | ~15 万条（估） | 搜索索引 |
| 切片缓存 | `.mp4` | 按需增长 | 加速二次播放 |

### 3.2 字幕获取（合法公开资源）

> ⚠️ 字幕文件通常为用户贡献，仅用于个人学习研究。公开网站需遵守其 ToS，商用需另行授权。

#### 推荐来源（按优先级）

| 来源 | URL | 说明 | MVP 建议 |
|------|-----|------|----------|
| **OpenSubtitles** | https://www.opensubtitles.com | 英/中字幕全，需注册 API | ✅ 主来源 |
| **Subscene** | https://subscene.com | 按剧名搜索 "The Big Bang Theory" | ✅ 备用 |
| **射手网镜像/社区** | 各开源字幕聚合站 | 中文翻译质量参差，需人工抽检 | 备选 |

#### OpenSubtitles API 下载流程

```bash
# 1. 注册账号 → 获取 API Key
# 2. 搜索剧集 IMDB ID: tt0898266 (The Big Bang Theory)
# 3. 按 season/episode 下载：
#    - language: eng → 存 data/raw/subtitles/en/s{NN}e{NN}.srt
#    - language: zho / chi → 存 data/raw/subtitles/zh/s{NN}e{NN}.srt
```

**AI Coding 任务**：实现 `scripts/ingest/download-subtitles.ts`（调用 OpenSubtitles REST API，带 rate limit）。

#### 字幕质量检查清单

- [ ] 每集 EN/ZH 文件都存在
- [ ] 时间轴单调递增
- [ ] 无大量乱码（编码 UTF-8）
- [ ] 随机抽检 10 集：关键台词对齐误差 < 1s

### 3.3 视频获取（合规说明）

> **重要**：完整 MP4 受版权保护。本项目假设你**已合法拥有**片源（购买蓝光/数字版），仅做**个人备份与索引**，不公开分发原片。

| 方式 | 操作 | 合法性 |
|------|------|--------|
| **自有蓝光/DVD 转码** | MakeMKV 提取 → HandBrake 转 H.264 | ✅ 个人使用（地区法律不同） |
| **iTunes / Amazon 购买** | 平台下载工具（视 ToS 而定） | ⚠️ 通常禁止剥离 DRM |
| **网盘资源 / 盗版站** | — | ❌ 不推荐、不写入手册 |

**推荐转码参数**（平衡体积与切片速度）：

```bash
ffmpeg -i input.mkv \
  -c:v libx264 -crf 23 -preset medium \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output/s01e01.mp4
```

- `-movflags +faststart`：moov atom 前置，便于 Web 流式 seek
- 单集约 **200–400 MB**，全剧约 **60–110 GB**

**文件命名规范**（强制）：

```
s{season:02d}e{episode:02d}.mp4
例：s01e01.mp4, s12e24.mp4
```

### 3.4 语料入库 Pipeline（分步）

```
Step 1  下载/放置原始 SRT
        data/raw/subtitles/{en|zh}/s01e01.srt

Step 2  放置/上传原始 MP4（可先 MVP 只做 Season 1）
        → 本地 staging/ → upload-episode.ts → MinIO episodes/

Step 3  parse-srt.ts（EN + ZH）

Step 4  align-bilingual.ts → 结构化 JSON（可选中间产物）
        data/processed/s01e01.dialogues.json

Step 5  seed-db.ts → PostgreSQL dialogues 表

Step 6  sync-meili.ts → Meilisearch index "dialogues"

Step 7  验证：search("bazinga") 有结果
```

### 3.5 MVP 语料范围建议（降本）

| 阶段 | 覆盖范围 | 存储占用（估） | 目的 |
|------|----------|---------------|------|
| **MVP-0** | Season 1（17 集） | ~5 GB 视频 + 50 MB 字幕 | 打通全链路 |
| **MVP-1** | Season 1–3 | ~15 GB | 内测 |
| **GA** | 全 12 季 | ~80–110 GB | 正式上线 |

---

## 4. 数据存储与成本方案

### 4.1 存储分层策略（核心原则）

```
┌─────────────────────────────────────────────────────────────┐
│  热数据（频繁访问）                                           │
│  · Meilisearch 索引（内存 + 磁盘）                            │
│  · Redis：clip 状态、presign URL 缓存（TTL 55min）            │
│  · MinIO clips/：已生成的切片（命中后直出）                    │
├─────────────────────────────────────────────────────────────┤
│  温数据（按需读取）                                           │
│  · MinIO episodes/：整集 MP4（切片时读取，不直接暴露给用户）     │
├─────────────────────────────────────────────────────────────┤
│  元数据（结构化）                                             │
│  · PostgreSQL：dialogues, clips, shares, episodes            │
└─────────────────────────────────────────────────────────────┘
```

**关键决策**：

1. **不预切全量片段** → 省存储 90%+（15 万句 × 平均 3s ≈ 125 小时切片 ≈ 额外 60GB+）
2. **按需切片 + 永久缓存热点** → 首次慢、二次快
3. **原片放 MinIO，不放 Git、不放 PG** → PG 只存对象 Key
4. **分享页引用 dialogue_id**，不复制视频文件

### 4.2 数据库 Schema（PostgreSQL）

```sql
-- 剧集元信息
CREATE TABLE episodes (
  id            SERIAL PRIMARY KEY,
  season        SMALLINT NOT NULL,
  episode       SMALLINT NOT NULL,
  title         TEXT,
  minio_key     TEXT NOT NULL,  -- episodes/s01e01.mp4
  duration_ms   INT,
  UNIQUE(season, episode)
);

-- 台词（搜索主体）
CREATE TABLE dialogues (
  id            TEXT PRIMARY KEY,  -- s01e01-0042
  episode_id    INT REFERENCES episodes(id),
  start_ms      INT NOT NULL,
  end_ms        INT NOT NULL,
  text_en       TEXT NOT NULL,
  text_zh       TEXT,
  speaker       TEXT,              -- MVP 可空，后续 NLP 提取
  line_index    INT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_dialogues_episode ON dialogues(episode_id);

-- 切片状态（与 MinIO 对象对应）
CREATE TABLE clips (
  dialogue_id   TEXT PRIMARY KEY REFERENCES dialogues(id),
  minio_key     TEXT,              -- clips/s01e01-0042.mp4
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending|processing|ready|failed
  file_size     INT,
  generated_at  TIMESTAMPTZ,
  error_message TEXT
);

-- 分享快照
CREATE TABLE shares (
  slug          TEXT PRIMARY KEY,  -- 8 位随机串
  dialogue_ids  JSONB NOT NULL,    -- ["s01e01-0042", ...]
  created_at    TIMESTAMPTZ DEFAULT now(),
  expires_at    TIMESTAMPTZ       -- NULL = 永不过期（MVP）
);
```

### 4.3 MinIO Bucket 规划

| Bucket | 前缀 | 内容 | 访问策略 |
|--------|------|------|----------|
| `tbbt-media` | `episodes/` | 整集 MP4 | **私有**，仅 worker 读 |
| `tbbt-media` | `clips/` | 切片 MP4 | **私有**，API presign 给前端 |
| `tbbt-media` | `staging/` | 上传中转 | 私有，入库后删除 |

### 4.4 成本最低部署方案对比

| 方案 | 月成本（估） | 适合阶段 | 说明 |
|------|-------------|----------|------|
| **A. 单 VPS + MinIO 自建** | **¥50–80** | MVP ✅ | Hetzner CX32 4vCPU 8GB + 160GB NVMe |
| B. VPS + Backblaze B2 | ¥30 + ¥40 存储 | 全剧 GA | 存储便宜， egress 需 Cloudflare 免流 |
| C. 全 AWS S3 + RDS | ¥300+ | ❌ MVP 不推荐 | 运维简单但贵 |

**推荐 MVP：方案 A**

```
Hetzner CX32 (≈ €6.5/mo)
├── Docker: next-app, postgres, meilisearch, redis, minio
├── 160GB NVMe：episodes 80GB + clips 缓存 30GB + 系统 50GB
└── 域名 + Cloudflare CDN（免费）仅加速 clips presign 流量
```

**扩容路径**：磁盘满 → 挂 Volume 或迁移 episodes 到 B2，MinIO 做 Gateway。

### 4.5 存储成本估算（Season 1 MVP）

| 项目 | 大小 | 备注 |
|------|------|------|
| 字幕 + PG 元数据 | < 100 MB | 可忽略 |
| Meilisearch 索引 | ~200 MB | 全剧约 2 GB |
| 原片 S1 | ~5 GB | |
| 切片缓存（按需） | ~2 GB 初期 | 假设 500 条热点 × 4MB |
| **合计** | **~8 GB** | 160GB 盘绰绰有余 |

---

## 5. 前端设计（MVP）

> 📎 **设计稿占位**：用户将提供页面设计稿，接入时替换本节 wireframe 中的尺寸/色值。  
> 当前按功能逻辑给出交互规格，视觉以设计稿为准。

### 5.1 页面清单

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 搜索主页 | 搜索 + 结果 + 播放器 + 素材篮 |
| `/share/[slug]` | 分享页 | 只读，展示选中素材列表 |

### 5.2 搜索主页布局（逻辑线框）

```
┌────────────────────────────────────────────────────────────────┐
│  Logo   [  搜索框：输入关键词…          🔍 ]    [EN|中|双语]     │
├───────────────────────────────┬────────────────────────────────┤
│  搜索结果区 (60%)              │  预览区 (40%)                   │
│  ┌─────────────────────────┐  │  ┌──────────────────────────┐  │
│  │ S03E05 · Sheldon        │  │  │                          │  │
│  │ "Bazinga!" / "逗你玩！"   │  │  │     ClipPlayer           │  │
│  │ 02:05 - 02:08  [+素材篮] │  │  │     (16:9)               │  │
│  └─────────────────────────┘  │  │                          │  │
│  ┌─────────────────────────┐  │  └──────────────────────────┘  │
│  │ ... 虚拟滚动列表          │  │  当前：S03E05 #42              │
│  └─────────────────────────┘  │  [ 上一句 ] [ 下一句 ]          │
├───────────────────────────────┴────────────────────────────────┤
│  素材篮 FAB (3)  →  点击展开 Drawer                               │
└────────────────────────────────────────────────────────────────┘
```

### 5.3 核心交互流程

#### 流程 1：搜索 → 预览

```
用户输入 "bazinga" (debounce 300ms)
    → GET /api/search?q=bazinga&lang=both
    → ResultList 渲染（关键词高亮）
用户点击某条结果
    → setActiveDialogue(id)
    → GET /api/clips/{id}/stream
        ├─ status=ready → 返回 presigned URL → ClipPlayer 加载
        └─ status=pending → 显示「生成中…」+ 轮询每 2s，最多 30s
    → 播放器 auto-play，end_ms 到达 pause()
```

#### 流程 2：加入素材篮

```
用户点击 [+素材篮]
    → useBasket.add(dialogue)
    → localStorage key: tbbt_basket_v1
    → FAB 数字 +1
    → Toast「已加入素材篮」
重复添加 → 忽略或 Toast「已在篮中」
```

#### 流程 3：分享

```
用户打开素材篮 Drawer → 点击「生成分享链接」
    → POST /api/share { dialogue_ids: [...] }
    → 返回 { slug, url: "https://domain/share/abc12xyz" }
    → 复制到剪贴板 + Toast
访问 /share/abc12xyz
    → GET /api/share/abc12xyz
    → 只读列表，点击条目同样走 clip stream
```

### 5.4 组件状态定义

```typescript
// types/frontend.ts

interface SearchState {
  query: string;
  results: DialogueHit[];
  loading: boolean;
  error?: string;
}

interface PlayerState {
  activeId: string | null;
  streamUrl: string | null;
  clipStatus: 'idle' | 'loading' | 'generating' | 'playing' | 'error';
}

interface BasketState {
  items: DialogueHit[];  // 最多 MVP 限制 20 条
}
```

### 5.5 空态 / 错态 / 加载态

| 场景 | UI 表现 |
|------|---------|
| 未搜索 | 插画 + 「输入关键词开始搜索」+ 热门词 chips（静态配置） |
| 无结果 | 「未找到相关台词」+ 建议换词 |
| 切片生成中 | 播放器区 Skeleton + 进度文案 |
| 切片失败 | 「片段暂不可用」+ 重试按钮 |
| 素材篮为空 | Drawer 内空态 illustration |

### 5.6 设计稿对接说明

当你提供设计稿后，AI Coding 按此 mapping 落地：

| 设计稿页面 | 对应组件 | 备注 |
|-----------|----------|------|
| 首页-默认 | `SearchBar` + 空态 | |
| 首页-有结果 | `ResultList` + `ClipPlayer` | 注意响应式：移动端预览区折叠为底部 Sheet |
| 素材篮 | `MaterialBasket` Drawer | |
| 分享页 | `SharePage` | 无编辑能力 |

---

## 6. 后端 API 与数据流转

### 6.1 API 契约

#### `GET /api/search`

```
Query: q (required), lang=en|zh|both, season?, limit=20, offset=0

Response 200:
{
  "hits": [
    {
      "id": "s03e05-0042",
      "season": 3, "episode": 5,
      "start_ms": 125400, "end_ms": 128900,
      "text_en": "Bazinga!",
      "text_zh": "逗你玩！",
      "speaker": "Sheldon",
      "_highlight": { "text_en": "<em>Bazinga</em>!" }
    }
  ],
  "total": 15,
  "processingTimeMs": 12
}
```

#### `GET /api/clips/:dialogueId/stream`

```
Response 200 (ready):
{ "status": "ready", "url": "https://minio.../presigned...", "expires_in": 3600 }

Response 202 (generating):
{ "status": "processing", "retry_after": 2 }

Response 404: dialogue 不存在
```

#### `POST /api/share`

```
Body: { "dialogue_ids": ["s01e01-0010", "s03e05-0042"] }

Response 201:
{ "slug": "k8m2p9xq", "url": "/share/k8m2p9xq" }
```

#### `GET /api/share/:slug`

```
Response 200:
{
  "slug": "k8m2p9xq",
  "items": [ /* DialogueHit[] */ ],
  "created_at": "2026-08-12T..."
}
```

### 6.2 切片生成时序

```
Client          API             Redis           Worker          MinIO
  │              │                │               │              │
  │ GET /stream  │                │               │              │
  │─────────────>│                │               │              │
  │              │ clip.status?   │               │              │
  │              │──────────────────────────────────────────────>│
  │              │ pending        │               │              │
  │              │ LPUSH queue    │               │              │
  │              │───────────────>│               │              │
  │ 202 processing               │               │              │
  │<─────────────│                │               │              │
  │              │                │ BRPOP         │              │
  │              │                │──────────────>│              │
  │              │                │               │ GET episode  │
  │              │                │               │─────────────>│
  │              │                │               │ ffmpeg cut   │
  │              │                │               │ PUT clip     │
  │              │                │               │─────────────>│
  │              │                │               │ UPDATE pg    │
  │ poll         │                │               │              │
  │─────────────>│ ready + presign│               │              │
  │<─────────────│                │               │              │
```

---

## 7. 分阶段实现计划（AI Coding 行动清单）

### Phase 0 — 项目脚手架（Day 1）

**目标**：Monorepo 可启动，Docker 依赖就绪。

```
Tasks:
- [ ] 初始化 pnpm monorepo: apps/web, packages/{db,search,clip,media,share}
- [ ] docker-compose.yml: postgres, meilisearch, redis, minio
- [ ] .env.example 填写所有连接串
- [ ] .cursor/rules/project.mdc 写入技术约定
```

**Cursor Prompt 模板**：
```
请按 docs/implementation-handbook.md Phase 0 初始化 monorepo，
使用 Next.js 15 + pnpm workspace + Docker Compose（PG/Meili/Redis/MinIO）。
```

**验收**：`docker compose up -d` 全部 healthy；`pnpm dev` 能打开空白页。

---

### Phase 1 — 语料入库 M1（Day 2–3）

**目标**：Season 1 字幕入库，可 SQL 查询。

```
Tasks:
- [ ] 实现 parse-srt.ts, align-bilingual.ts
- [ ] 实现 Drizzle schema + migrate
- [ ] 实现 seed-db.ts（读 data/processed/）
- [ ] 手动放置 S1 EN/ZH SRT，跑 pipeline
- [ ] 单元测试：parse-srt 样本文件
```

**验收**：`SELECT count(*) FROM dialogues` > 5000（S1）；随机 10 条双语合理。

---

### Phase 2 — 搜索 M4（Day 4）

**目标**：API 搜索可用。

```
Tasks:
- [ ] Meilisearch index 配置
- [ ] sync-meili.ts
- [ ] GET /api/search 实现 + 高亮
- [ ] 前端 SearchBar + ResultList（mock 播放器）
```

**验收**：浏览器搜 "soft kitty" 返回结果 < 500ms。

---

### Phase 3 — 媒体 M2 + M5（Day 5–7）

**目标**：上传 S1 原片，按需切片可播放。

```
Tasks:
- [ ] upload-episode.ts 上传 MinIO
- [ ] ffmpeg-cut.ts + worker.ts + Redis 队列
- [ ] clips 表状态机
- [ ] GET /api/clips/:id/stream
- [ ] ClipPlayer 组件 + 轮询逻辑
```

**验收**：点击结果，首次 5–15s 出片，二次 < 1s。

---

### Phase 4 — 素材篮 + 分享 M6 + M7（Day 8–9）

```
Tasks:
- [ ] useBasket + MaterialBasket Drawer
- [ ] POST/GET /api/share
- [ ] /share/[slug] 页面
- [ ] 复制链接 UX
```

**验收**：选 3 条 → 分享链接 → 隐身窗口可访问。

---

### Phase 5 — MCP Server M8（Day 10）

```
Tasks:
- [ ] packages/mcp-server stdio 入口
- [ ] tools: search_dialogues, get_clip_info
- [ ] 写入 .cursor/mcp.json 配置示例
```

**验收**：Cursor 中调用 MCP 搜索返回台词 JSON。

---

### Phase 6 — 部署（Day 11–12）

见第 8 节。

---

## 8. 部署方案（低成本可实施）

### 8.1 目标环境

- **1 台** Hetzner CX32（或同等：4 vCPU / 8 GB RAM / 160 GB SSD）
- **1 个**域名（可选，Cloudflare 免费 DNS + HTTPS）

### 8.2 服务器目录结构

```
/opt/tbbt/
├── docker-compose.prod.yml
├── .env.prod                 # 密钥不入 Git
├── data/
│   ├── postgres/
│   ├── meilisearch/
│   ├── redis/
│   └── minio/
└── backups/
    └── pg/                   # 每日 pg_dump
```

### 8.3 docker-compose.prod.yml 服务清单

| 服务 | 镜像 | 端口 | 资源限制 |
|------|------|------|----------|
| `web` | 自建 Dockerfile | 3000 | 1 GB RAM |
| `worker` | 同 web 镜像，不同 CMD | — | 2 GB RAM（ffmpeg） |
| `postgres` | postgres:16-alpine | 5432 内网 | 512 MB |
| `meilisearch` | getmeili/meilisearch | 7700 内网 | 1 GB |
| `redis` | redis:7-alpine | 6379 内网 | 256 MB |
| `minio` | minio/minio | 9000 内网 | 512 MB |
| `caddy` | caddy:2 | 80/443 | 反向代理 |

### 8.4 部署步骤（逐步执行）

#### Step 1 — 购买并初始化 VPS

```bash
# SSH 登录后
apt update && apt upgrade -y
apt install -y docker.io docker-compose-plugin git
mkdir -p /opt/tbbt && cd /opt/tbbt
```

#### Step 2 — 克隆代码 & 配置环境变量

```bash
git clone <your-repo> app
cd app
cp .env.example .env.prod
```

`.env.prod` 关键项：

```env
DATABASE_URL=postgresql://tbbt:***@postgres:5432/tbbt
MEILI_HOST=http://meilisearch:7700
MEILI_MASTER_KEY=***random***
REDIS_URL=redis://redis:6379
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=***
MINIO_SECRET_KEY=***
MINIO_BUCKET=tbbt-media
NEXT_PUBLIC_APP_URL=https://tbbt.example.com
```

#### Step 3 — 启动基础设施

```bash
docker compose -f docker-compose.prod.yml up -d postgres meilisearch redis minio
# 等待 healthy
docker compose exec minio mc alias set local http://localhost:9000 $KEY $SECRET
docker compose exec minio mc mb local/tbbt-media
```

#### Step 4 — 数据库迁移 & 语料入库（一次性）

```bash
docker compose run --rm web pnpm db:migrate
docker compose run --rm web pnpm ingest:pipeline --season 1
docker compose run --rm web pnpm ingest:sync-meili
```

#### Step 5 — 上传 Season 1 视频

```bash
# 在本机（有 MP4 的机器）执行，通过 mc 或 rclone 上传
mc cp ./videos/s01*.mp4 remote/tbbt-media/episodes/
docker compose run --rm web pnpm ingest:register-episodes --season 1
```

#### Step 6 — 启动应用

```bash
docker compose -f docker-compose.prod.yml up -d web worker caddy
curl https://tbbt.example.com/api/health
```

#### Step 7 — 备份 cron

```cron
0 3 * * * docker compose exec -T postgres pg_dump -U tbbt tbbt | gzip > /opt/tbbt/backups/pg/$(date +\%F).sql.gz
```

### 8.5 运维 checklist（每周）

- [ ] `df -h` 磁盘 < 80%
- [ ] MinIO clips/ 目录大小（可选手动清理 90 天未访问）
- [ ] worker 日志无 ffmpeg 大量 failed
- [ ] Meilisearch index 文档数 = dialogues 表行数

### 8.6 扩容触发条件

| 信号 | 动作 |
|------|------|
| 磁盘 > 85% | 挂 Hetzner Volume 或 episodes 迁 B2 |
| CPU 持续 > 80% | worker 限并发 2→1，或升配 |
| 搜索 > 200ms | Meilisearch 加内存 |

---

## 9. Cursor 协作规范

### 9.1 `.cursor/rules/project.mdc` 要点

```markdown
-  monorepo：改动 packages 后检查 apps/web 引用
-  API 只做薄路由，业务逻辑放 packages/
-  所有时间戳用 ms 整数
-  dialogue id 格式：s{season}e{episode}-{line_index:04d}
-  不提交 .env、MP4、SRT 原始文件
-  ffmpeg 优先 -c copy，失败再 libx264
```

### 9.2 每个 Phase 的 Cursor 使用方式

| 阶段 | 推荐模式 | 提示 |
|------|----------|------|
| 脚手架 | Agent 全量生成 | 引用 handbook 章节号 |
| 单模块 | Composer 单 package | 「只改 packages/search」 |
| 联调 | Chat + 终端 | 贴 API 响应报错 |
| UI | Agent + 设计稿截图 | 「按设计稿实现 ResultItem」 |

### 9.3 Git 分支策略

```
main          ← 可部署
develop       ← 集成
feat/phase-1-ingest
feat/phase-2-search
...
```

---

## 10. 附录

### A. 项目 Monorepo 目录（终态）

```
tbbt-quotes/
├── apps/
│   └── web/                    # Next.js
├── packages/
│   ├── db/
│   ├── search/
│   ├── clip/
│   ├── media/
│   ├── share/
│   └── mcp-server/
├── scripts/
│   └── ingest/
├── data/
│   ├── raw/subtitles/          # gitignore
│   └── processed/              # gitignore
├── docker-compose.yml
├── docker-compose.prod.yml
├── docs/
│   └── implementation-handbook.md  # 本文档
└── .cursor/
    └── rules/
```

### B. 环境变量完整清单

| 变量 | 用途 |
|------|------|
| `DATABASE_URL` | PostgreSQL |
| `MEILI_HOST` / `MEILI_MASTER_KEY` | 搜索 |
| `REDIS_URL` | 队列 |
| `MINIO_*` | 对象存储 |
| `FFMPEG_PATH` | 默认 `/usr/bin/ffmpeg` |
| `CLIP_PADDING_MS` | 切片前后 padding，默认 200 |

### C. 风险 register

| 风险 | 缓解 |
|------|------|
| 字幕时间轴不准 | 对齐脚本 + 人工抽检 |
| 版权 | 不公开原片下载；仅 presign 短时 URL |
| 磁盘满 | 监控 + clips LRU 清理 |
| ffmpeg 并发 OOM | worker 并发 = 1（MVP） |

### D. 设计稿接入后的更新项

- [ ] 色板 / 字体 token 写入 `tailwind.config.ts`
- [ ] 组件 spacing 与设计稿对齐
- [ ] 移动端断点行为（预览 Sheet）

---

## 下一步行动

1. **你**：确认 MVP 语料范围（建议 Season 1）+ 提供页面设计稿  
2. **AI**：按 Phase 0 脚手架开始 Coding  
3. **你**：准备 S1 字幕（OpenSubtitles）+ 自有 MP4 转码上传  

---

*本文档为 AI Coding 唯一权威参考；实现偏离时需先更新本文档。*
