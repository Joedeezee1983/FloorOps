/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3002', 'floorops.tech'],
    },
  },
}

export default nextConfig
