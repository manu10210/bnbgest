import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration pour éviter les erreurs de compilation
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Optimisations de performance
  compress: true,
  poweredByHeader: false,
  
  // Configuration des images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  
  // Optimisations de bundle
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  
  // Packages externes pour server components
  serverExternalPackages: ['ical', 'xml2js'],
  
  // Redirections automatiques
  async redirects() {
    return [
      {
        source: '/admin2',
        destination: '/admin',
        permanent: true,
      },
    ];
  },
  
  // Headers pour améliorer la performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
