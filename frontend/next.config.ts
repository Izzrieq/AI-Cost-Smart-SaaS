import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname, // points to the frontend folder
  },

  async headers () {
    return [
      {
        source: '/(.*)', // Match all routes
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups"
          }
        ]
      }
    ];
  }
};

export default nextConfig;