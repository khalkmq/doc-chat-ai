/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Static export for serving from FastAPI
  distDir: 'dist',   // Output to dist/ instead of .next/
  images: {
    unoptimized: true // Required for static export
  },
  trailingSlash: true, // Better compatibility with static hosting
}

export default nextConfig
