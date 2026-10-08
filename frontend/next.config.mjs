/** @type {import('next').NextConfig} */
const API_TARGET = process.env.API_TARGET || 'http://localhost:8000'

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Connects the frontend to the SentinelDRP backend (server/, port 8000).
  // The frontend calls relative /api/... paths; Next.js forwards them to Express.
  async rewrites() {
    return [
      // Frontend route names -> backend route names
      { source: '/api/social-scan', destination: `${API_TARGET}/api/scan/social` },
      { source: '/api/app-scan', destination: `${API_TARGET}/api/scan/apps` },
      // Everything else maps one-to-one (/api/brand, /api/health, /api/threat, ...)
      { source: '/api/:path*', destination: `${API_TARGET}/api/:path*` },
    ]
  },
}

export default nextConfig
