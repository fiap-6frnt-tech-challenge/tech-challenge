import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@bytebank/shared'],
  experimental: {
    optimizePackageImports: ['@hookform/resolvers', 'lucide-react'],
  },
};

export default nextConfig;
