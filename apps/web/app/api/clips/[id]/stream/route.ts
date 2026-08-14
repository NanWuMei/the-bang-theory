import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { ensureClipMedia } from "@tbbt/clip";
import { CLIPS_BUCKET, createSignedUrl, isStorageConfigured } from "@tbbt/media";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const { clipPath, clipKey } = await ensureClipMedia(id);

    if (isStorageConfigured()) {
      const signedUrl = await createSignedUrl(CLIPS_BUCKET, clipKey, 3600);
      return NextResponse.redirect(signedUrl, 302);
    }

    const buf = await readFile(clipPath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "video/mp4",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[api/clips/stream]", id, err);
    const msg = err instanceof Error ? err.message : "生成失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
