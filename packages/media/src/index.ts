import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const EPISODES_PREFIX = "episodes/";
export const CLIPS_PREFIX = "clips/";

export function getMinioConfig() {
  return {
    endpoint: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
    bucket: process.env.MINIO_BUCKET ?? "tbbt-media",
    region: "us-east-1",
  };
}

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

export function episodeKey(season: number, episode: number) {
  return `${EPISODES_PREFIX}s${String(season).padStart(2, "0")}e${String(episode).padStart(2, "0")}.mp4`;
}

export function clipKey(dialogueId: string) {
  return `${CLIPS_PREFIX}${dialogueId}.mp4`;
}

/** 生成预签名播放 URL，默认 1 小时有效 */
export async function presignGetUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const cfg = getMinioConfig();
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: cfg.bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

export { PutObjectCommand, GetObjectCommand };
