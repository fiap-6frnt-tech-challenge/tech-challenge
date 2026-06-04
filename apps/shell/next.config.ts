import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@bytebank/shared',
    '@bytebank/design-system',
    '@bytebank/api-client',
    '@bytebank/stores',
  ],
  experimental: {
    optimizePackageImports: ['@hookform/resolvers', 'lucide-react', '@bytebank/design-system'],
  },
};

export default nextConfig;
