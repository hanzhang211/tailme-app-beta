import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // 注：Next 16 已移除 next.config 的 `eslint` 选项（next lint 改为 ESLint CLI），
  // 构建阶段不再跑 ESLint，故无需 ignoreDuringBuilds。
};

export default nextConfig;