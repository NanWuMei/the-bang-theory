import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { ensureClipMedia } from "@tbbt/clip";
import { CLIPS_BUCKET, createSignedUrl, isStorageConfigured } from "@tbbt/media";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const { thumbPath, thumbKey } = await ensureClipMedia(id);

    if (isStorageConfigured()) {
      const signedUrl = await createSignedUrl(CLIPS_BUCKET, thumbKey, 3600);
      return NextResponse.redirect(signedUrl, 302);
    }

    const buf = await readFile(thumbPath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[api/clips/thumbnail]", id, err);
    return NextResponse.json({ error: "缩略图生成失败" }, { status: 500 });
  }
}
