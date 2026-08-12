import type { NextConfig } from "next";

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
