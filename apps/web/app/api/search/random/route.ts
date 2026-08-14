import { NextResponse } from "next/server";
import { searchRandomLines } from "@tbbt/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 9), 20);

  try {
    const hits = await searchRandomLines(limit);
    return NextResponse.json({ hits });
  } catch (err) {
    console.error("[api/search/random]", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
