/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,  // Static export only for production
  distDir: 'dist',   // Output to dist/ instead of .next/
  images: {
    unoptimized: true // Required for static export
  },
  trailingSlash: true, // Better compatibility with static hosting
  
  // API proxy for local development (only works in dev mode, not with static export)
  async rewrites() {
    return process.env.NODE_ENV === 'production' ? [] : [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ]
  },
}

export default nextConfig
