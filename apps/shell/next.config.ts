import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['@hookform/resolvers', 'lucide-react'],
  },
};

export default nextConfig;
