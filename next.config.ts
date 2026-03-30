import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration pour éviter les erreurs de compilation
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
