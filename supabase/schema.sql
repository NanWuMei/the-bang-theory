-- ============================================================
-- TBBT 台词素材平台 — 数据库 Schema
-- 整段复制到 Supabase SQL Editor 执行：
-- https://supabase.com/dashboard/project/dlkxlxtwszgrnxoctdgt/sql/new
-- ============================================================

-- 1. 启用 pg_trgm（模糊搜索 / ILIKE 加速）
create extension if not exists pg_trgm;

-- ============================================================
-- 2. episodes — 剧集元信息
-- ============================================================
create table if not exists episodes (
  id            serial primary key,
  season        smallint not null,
  episode       smallint not null,
  title         text,
  storage_key   text not null,              -- Storage object key，例 episodes/s01e01.mp4
  duration_ms   int,
  created_at    timestamptz default now(),
  unique (season, episode)
);

-- ============================================================
-- 3. subtitle_lines — 字幕行（搜索主体）
-- ============================================================
create table if not exists subtitle_lines (
  id            text primary key,           -- s01e01-0042
  episode_id    int not null references episodes(id) on delete cascade,
  start_ms      int not null,               -- 毫秒整数
  end_ms        int not null,
  en_text       text not null,
  zh_text       text,
  speaker       text,
  line_index    int not null,
  -- 自动合并中英文，供统一搜索
  search_text   text generated always as (
    coalesce(en_text, '') || ' ' || coalesce(zh_text, '')
  ) stored,
  created_at    timestamptz default now()
);

-- ============================================================
-- 4. 搜索索引（GIN + pg_trgm）
-- ============================================================
create index if not exists subtitle_lines_search_trgm_idx
  on subtitle_lines using gin (search_text gin_trgm_ops);

create index if not exists subtitle_lines_en_trgm_idx
  on subtitle_lines using gin (en_text gin_trgm_ops);

create index if not exists subtitle_lines_zh_trgm_idx
  on subtitle_lines using gin (zh_text gin_trgm_ops);

create index if not exists subtitle_lines_episode_id_idx
  on subtitle_lines (episode_id);

create index if not exists subtitle_lines_start_ms_idx
  on subtitle_lines (start_ms);

-- ============================================================
-- 5. clip_cache — 视频切片缓存（按需生成）
-- ============================================================
create table if not exists clip_cache (
  subtitle_line_id  text primary key references subtitle_lines(id) on delete cascade,
  storage_key       text,                   -- clips/s01e01-0042.mp4
  status            text not null default 'pending',  -- pending|processing|ready|failed
  file_size         int,
  generated_at      timestamptz,
  error_message     text
);

-- ============================================================
-- 6. selected_assets — 用户选中的素材篮 / 分享
-- ============================================================
create table if not exists selected_assets (
  id            uuid primary key default gen_random_uuid(),
  line_ids      text[] not null,            -- ['s01e01-0042', 's01e01-0103']
  share_title   text,
  created_at    timestamptz default now()
);

-- ============================================================
-- 7. 验证（执行后可取消注释运行）
-- ============================================================
-- select tablename from pg_tables where schemaname = 'public' order by tablename;
-- select indexname from pg_indexes where schemaname = 'public' order by indexname;
