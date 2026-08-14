"use client";

import { useEffect, useRef, useState } from "react";
import type { SubtitleLineHit } from "@tbbt/search";
import { formatEpisode, formatTimestamp } from "@/lib/format";

interface VideoModalProps {
  hit: SubtitleLineHit;
  onClose: () => void;
}

export function VideoModal({ hit, onClose }: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
          aria-label="关闭"
        >
          ✕
        </button>

        <div className="relative aspect-video bg-black">
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <p className="text-sm">正在生成片段…</p>
            </div>
          )}
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-300">
              {error}
            </div>
          ) : (
            <video
              ref={videoRef}
              src={`/api/clips/${hit.id}/stream`}
              className="h-full w-full"
              controls
              autoPlay
              playsInline
              onLoadedData={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError("视频加载失败，请确认已安装 ffmpeg 且源视频存在");
              }}
            />
          )}
        </div>

        <div className="border-t border-white/10 bg-gray-950 px-4 py-3">
          <p className="text-xs text-gray-400">
            {formatEpisode(hit.season, hit.episode)} ·{" "}
            {formatTimestamp(hit.start_ms)}
          </p>
          <p className="mt-1 text-sm font-medium text-white">{hit.text_en}</p>
          {hit.text_zh && (
            <p className="mt-0.5 text-sm text-gray-400">{hit.text_zh}</p>
          )}
        </div>
      </div>
    </div>
  );
}
