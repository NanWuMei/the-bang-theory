import { readFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const VIDEOS_BUCKET = "tbbt-videos";
export const CLIPS_BUCKET = "tbbt-clips";

export const EPISODES_PREFIX = "episodes/";
export const CLIPS_PREFIX = "clips/";
export const THUMBS_PREFIX = "thumbs/";

export function episodeKey(season: number, episode: number) {
  return `${EPISODES_PREFIX}s${String(season).padStart(2, "0")}e${String(episode).padStart(2, "0")}.mp4`;
}

export function clipKey(lineId: string) {
  return `${CLIPS_PREFIX}${lineId}.mp4`;
}

export function thumbKey(lineId: string) {
  return `${THUMBS_PREFIX}${lineId}.jpg`;
}

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!isStorageConfigured()) {
    throw new Error(
      "Supabase Storage 未配置：请在 .env 设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  if (!adminClient) {
    adminClient = createClient(
      process.env.SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return adminClient;
}

export async function uploadLocalFile(
  bucket: string,
  objectKey: string,
  localPath: string,
  contentType: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const body = await readFile(localPath);
  const { error } = await supabase.storage.from(bucket).upload(objectKey, body, {
    upsert: true,
    contentType,
  });
  if (error) throw new Error(`Storage upload failed (${objectKey}): ${error.message}`);
}

export async function createSignedUrl(
  bucket: string,
  objectKey: string,
  expiresIn = 3600
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectKey, expiresIn);
  if (error || !data?.signedUrl) {
    throw new Error(
      `Signed URL failed (${objectKey}): ${error?.message ?? "empty url"}`
    );
  }
  return data.signedUrl;
}

export async function objectExists(
  bucket: string,
  objectKey: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const folder = objectKey.includes("/")
    ? objectKey.slice(0, objectKey.lastIndexOf("/"))
    : "";
  const name = objectKey.includes("/")
    ? objectKey.slice(objectKey.lastIndexOf("/") + 1)
    : objectKey;
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    search: name,
    limit: 1,
  });
  if (error) return false;
  return (data ?? []).some((item) => item.name === name);
}
