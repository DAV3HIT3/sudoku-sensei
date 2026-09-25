import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A self-contained server directory, so the image carries only what the app imports.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
