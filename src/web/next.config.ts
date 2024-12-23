import type { NextConfig } from 'next';

/**
 * Production-ready Next.js configuration with comprehensive settings for
 * security, performance optimization, and Vercel deployment.
 * 
 * @version Next.js 14.x
 * @see Technical Specifications/2. SYSTEM ARCHITECTURE/2.5 Deployment Architecture
 */
const config: NextConfig = {
  // Enable React strict mode for enhanced development checks
  reactStrictMode: true,

  // Use SWC minifier for faster builds
  swcMinify: true,

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Enable compression for better performance
  compress: true,

  // Enable ETag generation for caching
  generateEtags: true,

  // Environment variables configuration
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Image optimization configuration
  images: {
    domains: ['localhost', 'vercel.app'],
    deviceSizes: [640, 768, 1024, 1280, 1536],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
  },

  // Security headers configuration
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.vercel.app",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Webpack configuration for optimization
  webpack: (config, { dev, isServer }) => {
    // Production optimization settings
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          minChunks: 1,
        },
        minimize: true,
        runtimeChunk: 'single',
      };

      config.performance = {
        hints: 'warning',
        maxEntrypointSize: 512000,
        maxAssetSize: 512000,
      };
    }

    return config;
  },

  // Experimental features
  experimental: {
    // Enable server actions for enhanced functionality
    serverActions: true,
    // Enable typed routes for better type safety
    typedRoutes: true,
    // Enable CSS optimization
    optimizeCss: true,
    // Enable scroll restoration
    scrollRestoration: true,
  },

  // TypeScript configuration
  typescript: {
    // Enforce type checking during build
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json',
  },
};

export default config;