"use client";

import { useState } from "react";
import type { SubtitleLineHit } from "@tbbt/search";
import { formatEpisode, formatTimestamp } from "@/lib/format";

interface ResultCardProps {
  hit: SubtitleLineHit;
  onClick?: () => void;
}

export function ResultCard({ hit, onClick }: ResultCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const thumbUrl = `/api/clips/${hit.id}/thumbnail`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-gray-900 text-left shadow-sm ring-1 ring-gray-200 transition hover:shadow-md hover:ring-brand-blue/40"
    >
      {/* 加载占位 */}
      {!imgLoaded && !imgError && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-700 to-slate-900" />
      )}

      {/* 失败回退 */}
      {imgError && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900" />
      )}

      {/* 真实截图 */}
      {!imgError && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbUrl}
          alt={hit.text_en}
          className={`absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105 ${
            imgLoaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      )}

      {/* 播放按钮 */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
          ▶
        </span>
      </div>

      <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
        {formatEpisode(hit.season, hit.episode)}
      </span>
      <span className="absolute right-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
        {formatTimestamp(hit.start_ms)}
      </span>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-3 pt-10">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-white drop-shadow">
          {hit.text_en}
        </p>
        {hit.text_zh && (
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-white/85 drop-shadow">
            {hit.text_zh}
          </p>
        )}
      </div>
    </button>
  );
}
