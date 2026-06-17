import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  // 告知 Turbopack 存在空配置即可
  turbopack: {},
  env: {
    // 作品展示表 fallback（部署平台未配置时使用）
    FEISHU_BASE_APP_TOKEN_PROJECTS:
      process.env.FEISHU_BASE_APP_TOKEN_PROJECTS || "NGQewrPv5iyEsFkkF7kcEqgWnRc",
    FEISHU_TABLE_ID_PROJECTS:
      process.env.FEISHU_TABLE_ID_PROJECTS || "tblNhjrah9RTNDfm",
  },
};

export default withPWA(nextConfig);
