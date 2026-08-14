import { access, stat } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@tbbt/db";
import { cutClip, extractThumbnail } from "./ffmpeg";
import {
  CLIPS_BUCKET,
  clipKey as mediaClipKey,
  isStorageConfigured,
  thumbKey as mediaThumbKey,
  uploadLocalFile,
} from "@tbbt/media";
import {
  clipCachePath,
  clipPaddingMs,
  clipStorageKey,
  episodeVideoPath,
  thumbCachePath,
  thumbStorageKey,
} from "./paths";

export interface MediaPaths {
  clipPath: string;
  thumbPath: string;
  clipKey: string;
  thumbKey: string;
}

async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function getLineWithEpisode(lineId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: schema.subtitleLines.id,
      startMs: schema.subtitleLines.startMs,
      endMs: schema.subtitleLines.endMs,
      season: schema.episodes.season,
      episode: schema.episodes.episode,
    })
    .from(schema.subtitleLines)
    .innerJoin(
      schema.episodes,
      eq(schema.subtitleLines.episodeId, schema.episodes.id)
    )
    .where(eq(schema.subtitleLines.id, lineId))
    .limit(1);

  if (!row) throw new Error(`Subtitle line not found: ${lineId}`);
  return row;
}

/** 确保片段 MP4 与截图 JPG 已生成（按需 ffmpeg，本地缓存） */
export async function ensureClipMedia(lineId: string): Promise<MediaPaths> {
  const clipPath = clipCachePath(lineId);
  const thumbPath = thumbCachePath(lineId);
  const clipKey = clipStorageKey(lineId);
  const thumbKey = thumbStorageKey(lineId);

  const hasClip = await fileExists(clipPath);
  const hasThumb = await fileExists(thumbPath);
  if (hasClip && hasThumb) {
    return { clipPath, thumbPath, clipKey, thumbKey };
  }

  const line = await getLineWithEpisode(lineId);
  const sourceVideo = episodeVideoPath(line.season, line.episode);

  if (!(await fileExists(sourceVideo))) {
    throw new Error(
      `源视频不存在: ${sourceVideo}（请把 s01e01.mp4 放到 data/raw/videos/）`
    );
  }

  const db = getDb();
  await db
    .insert(schema.clipCache)
    .values({ subtitleLineId: lineId, status: "processing" })
    .onConflictDoUpdate({
      target: schema.clipCache.subtitleLineId,
      set: { status: "processing", errorMessage: null },
    });

  const pad = clipPaddingMs();
  const cutStart = Math.max(0, line.startMs - pad);
  const cutEnd = line.endMs + pad;
  const thumbAt = line.startMs + Math.floor((line.endMs - line.startMs) / 3);

  try {
    if (!hasThumb) {
      await extractThumbnail(sourceVideo, thumbAt, thumbPath);
    }
    if (!hasClip) {
      await cutClip(sourceVideo, cutStart, cutEnd, clipPath);
    }

    if (isStorageConfigured()) {
      const storageClipKey = mediaClipKey(lineId);
      const storageThumbKey = mediaThumbKey(lineId);
      await uploadLocalFile(CLIPS_BUCKET, storageClipKey, clipPath, "video/mp4");
      await uploadLocalFile(
        CLIPS_BUCKET,
        storageThumbKey,
        thumbPath,
        "image/jpeg"
      );
    }

    const clipStat = await stat(clipPath);
    await db
      .update(schema.clipCache)
      .set({
        status: "ready",
        storageKey: clipKey,
        fileSize: clipStat.size,
        generatedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(schema.clipCache.subtitleLineId, lineId));

    return { clipPath, thumbPath, clipKey, thumbKey };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(schema.clipCache)
      .set({ status: "failed", errorMessage: msg })
      .where(eq(schema.clipCache.subtitleLineId, lineId));
    throw err;
  }
}

export type ClipStatus = "pending" | "processing" | "ready" | "failed";

export interface ClipStreamResult {
  status: ClipStatus;
  url?: string;
  retryAfter?: number;
}

/** @deprecated 使用 ensureClipMedia + API 路由 */
export async function getClipStreamUrl(lineId: string): Promise<ClipStreamResult> {
  try {
    await ensureClipMedia(lineId);
    return { status: "ready", url: `/api/clips/${lineId}/stream` };
  } catch {
    return { status: "failed", retryAfter: 2 };
  }
}

export { ensureClipMedia as ensureMedia };
