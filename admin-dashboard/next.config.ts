/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://ai-receptionist-wywm.onrender.com/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;