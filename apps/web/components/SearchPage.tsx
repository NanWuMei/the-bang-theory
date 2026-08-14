"use client";

import { useCallback, useEffect, useState } from "react";
import type { SubtitleLineHit } from "@tbbt/search";
import { ResultCard } from "./ResultCard";
import { VideoModal } from "./VideoModal";

const HOT_TAGS = ["bazinga", "pizza", "friendship", "science", "roommate"];

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SubtitleLineHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SubtitleLineHit | null>(null);

  const loadRandom = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search/random?limit=9");
      if (!res.ok) throw new Error("加载失败");
      const data = (await res.json()) as { hits: SubtitleLineHit[] };
      setHits(data.hits);
      setTotal(data.hits.length);
      setSearched(false);
    } catch {
      setError("随机推荐加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      loadRandom();
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}&limit=9`
      );
      if (!res.ok) throw new Error("搜索失败");
      const data = (await res.json()) as {
        hits: SubtitleLineHit[];
        total: number;
      };
      setHits(data.hits);
      setTotal(data.total);
    } catch {
      setError("搜索失败，请检查网络或稍后重试");
      setHits([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [loadRandom]);

  useEffect(() => {
    loadRandom();
  }, [loadRandom]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSearch(query);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:px-6">
        {/* Header */}
        <header className="text-center">
          <h1 className="bg-gradient-to-r from-brand-pink to-brand-purple bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            The Big Bang Theory
          </h1>
          <p className="mt-2 text-lg text-gray-500">生活大爆炸</p>
          <p className="mx-auto mt-4 max-w-lg text-sm italic text-gray-400">
            &ldquo;I&apos;m not crazy, my mother had me tested.&rdquo; — Sheldon
            Cooper
          </p>
        </header>

        {/* Search */}
        <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-2xl">
          <div className="flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索台词，例如 bazinga、pizza..."
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition placeholder:text-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-brand-blue px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-60"
            >
              搜索
            </button>
          </div>
        </form>

        {/* Tags */}
        <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-gray-400">试试：</span>
          {HOT_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setQuery(tag);
                doSearch(tag);
              }}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Section title */}
        <h2 className="mt-12 text-center text-sm font-medium text-gray-500">
          {searched
            ? total > 0
              ? `找到 ${total} 条结果`
              : "未找到相关台词"
            : "随机推荐"}
        </h2>

        {/* Error */}
        {error && (
          <p className="mt-6 text-center text-sm text-red-500">{error}</p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="aspect-video animate-pulse rounded-xl bg-gray-100"
              />
            ))}
          </div>
        ) : hits.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hits.map((hit) => (
              <ResultCard
                key={hit.id}
                hit={hit}
                onClick={() => setPreview(hit)}
              />
            ))}
          </div>
        ) : (
          !error && (
            <p className="mt-8 text-center text-sm text-gray-400">
              换个关键词试试，或点击上方标签
            </p>
          )
        )}

        {searched && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                loadRandom();
              }}
              className="text-sm text-brand-blue hover:underline"
            >
              ← 返回随机推荐
            </button>
          </div>
        )}
      </div>

      {preview && (
        <VideoModal hit={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
