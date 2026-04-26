import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["*"],
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
