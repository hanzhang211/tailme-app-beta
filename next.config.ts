import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // 注：Next 16 已移除 next.config 的 `eslint` 选项（next lint 改为 ESLint CLI），
  // 构建阶段不再跑 ESLint，故无需 ignoreDuringBuilds。
  // 阿里云短信 SDK 含动态 require，交给 Node 运行时直接加载，避免 serverless 打包后运行时报错
  serverExternalPackages: [
    "@alicloud/dysmsapi20170525",
    "@alicloud/openapi-client",
    "@alicloud/tea-util",
    "@alicloud/tea-typescript",
  ],
};

export default nextConfig;