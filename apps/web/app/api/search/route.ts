import { NextRequest, NextResponse } from "next/server";
import { searchSubtitleLines } from "@tbbt/search";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const lang = (searchParams.get("lang") ?? "both") as "en" | "zh" | "both";
  const seasonParam = searchParams.get("season");
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  if (!q.trim()) {
    return NextResponse.json(
      { error: "Missing query parameter: q" },
      { status: 400 }
    );
  }

  if (!["en", "zh", "both"].includes(lang)) {
    return NextResponse.json(
      { error: "Invalid lang, must be en|zh|both" },
      { status: 400 }
    );
  }

  try {
    const result = await searchSubtitleLines(q, {
      lang,
      season: seasonParam ? Number(seasonParam) : 1,
      episode: 1,
      limit: limitParam ? Number(limitParam) : 20,
      offset: offsetParam ? Number(offsetParam) : 0,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/search]", err);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
