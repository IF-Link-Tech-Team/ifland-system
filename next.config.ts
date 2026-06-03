import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  allowedDevOrigins: ["beginning-committed-cabin-extras.trycloudflare.com"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "*.tos-cn-beijing.volces.com",
      },
      {
        protocol: "https",
        hostname: "*.volces.com",
      },
    ],
  },
  // 告知 Turbopack 存在空配置即可
  turbopack: {},
};

export default withPWA(nextConfig);
