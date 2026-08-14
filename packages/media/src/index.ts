export {
  CLIPS_BUCKET,
  CLIPS_PREFIX,
  EPISODES_PREFIX,
  THUMBS_PREFIX,
  VIDEOS_BUCKET,
  clipKey,
  createSignedUrl,
  episodeKey,
  getSupabaseAdmin,
  isStorageConfigured,
  objectExists,
  thumbKey,
  uploadLocalFile,
} from "./supabase-storage";

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export { PutObjectCommand, GetObjectCommand };

/** @deprecated 本地 MinIO，已由 Supabase Storage 取代 */
export function getMinioConfig() {
  return {
    endpoint: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
    bucket: process.env.MINIO_BUCKET ?? "tbbt-media",
    region: "us-east-1",
  };
}

/** @deprecated */
export function getS3Client() {
  const cfg = getMinioConfig();
  return new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKey,
      secretAccessKey: cfg.secretKey,
    },
    forcePathStyle: true,
  });
}

/** @deprecated 使用 createSignedUrl */
export async function presignGetUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const cfg = getMinioConfig();
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: cfg.bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn });
}
