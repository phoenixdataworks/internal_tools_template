/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  modularizeImports: {
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
  },
  compiler: {
    emotion: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  output: 'standalone',
  poweredByHeader: false,

  // 🟡 1. Webpack-only alias (kept for current production)
  webpack: config => {
    if (process.env.NEXT_RUNTIME === 'turbopack') return config; // noop
    config.resolve.alias = {
      ...config.resolve.alias,
      'webworker-threads': false, // stub for Webpack
    };
    return config;
  },

  // 🆕 2. Turbopack-specific settings
  turbopack: {
    resolveAlias: {
      'webworker-threads': '@empty', // stub for Turbopack
    },
    // rules / resolveExtensions can be added later when needed
  },
};

export default nextConfig;
