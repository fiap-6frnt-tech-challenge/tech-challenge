import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@bytebank/shared', '@bytebank/design-system'],
  experimental: {
    optimizePackageImports: ['@hookform/resolvers', 'lucide-react', '@bytebank/design-system'],
  },
};

export default nextConfig;
