import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";

// 从 monorepo 根目录加载 .env（与 ingest 脚本共用 DATABASE_URL）
loadEnvConfig(path.join(__dirname, "../.."));

const nextConfig: NextConfig = {
  transpilePackages: [
    "@tbbt/db",
    "@tbbt/search",
    "@tbbt/clip",
    "@tbbt/media",
    "@tbbt/share",
  ],
};

export default nextConfig;
