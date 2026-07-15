import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname, // points to the frontend folder
  },
};

export default nextConfig;