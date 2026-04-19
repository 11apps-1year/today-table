import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@today-table/core", "@today-table/firebase-storage"]
};

export default nextConfig;
