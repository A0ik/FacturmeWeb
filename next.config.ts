import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep pdf-parse out of the webpack bundle (it uses native bindings + CommonJS)
  serverExternalPackages: ['pdf-parse', 'canvas', 'pdf-lib'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
    ];
  },

  webpack(config, { isServer }) {
    if (isServer) {
      // Prevent webpack from trying to bundle native node modules
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        'pdf-parse',
        'canvas',
      ];
    }
    return config;
  },
};

export default nextConfig;
