/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Object Storage cho ảnh sản phẩm (Mục 3.1, 9.2 spec) — cập nhật domain thật khi có
      { protocol: 'https', hostname: '**.r2.dev' },
    ],
  },
};

module.exports = nextConfig;
