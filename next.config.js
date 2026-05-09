/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 640, 1024, 1920],
    imageSizes: [128, 256, 512, 1024],
    minimumCacheTTL: 31536000,
  },
}

export default nextConfig
