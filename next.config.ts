import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

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
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns'],
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Packages externes pour server components
  serverExternalPackages: ['ical', 'xml2js'],
  
  // React optimizations
  reactStrictMode: true,
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Tree shaking optimizations
// Advanced code splitting for client bundles only
    if (!isServer && !dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          
          // Main vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
            enforce: true,
          },
          
          // Common components shared across pages
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'async',
            priority: 10,
            reuseExistingChunk: true,
          },
          
          // Heavy date-fns library (if needed)
          datefns: {
            test: /[\\/]node_modules[\\/]date-fns/,
            name: 'datefns',
            chunks: 'all',
            priority: 30,
          },
          
          // Framer Motion animations
          framermotion: {
            test: /[\\/]node_modules[\\/]framer-motion/,
            name: 'framermotion',
            chunks: 'async',
            priority: 30,
          },
        },
      };
      
      // Minimize bundle size
      config.optimization.minimize = true;
    }

    return config;
  },
  
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

export default withBundleAnalyzer(nextConfig);

