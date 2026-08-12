export type ClipStatus = "pending" | "processing" | "ready" | "failed";

export interface ClipStreamResult {
  status: ClipStatus;
  url?: string;
  expiresIn?: number;
  retryAfter?: number;
}

/** Phase 3 实现：按需 ffmpeg 切片 + MinIO 缓存 */
export async function getClipStreamUrl(
  _dialogueId: string
): Promise<ClipStreamResult> {
  return { status: "pending", retryAfter: 2 };
}
