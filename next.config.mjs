/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.scdn.co', // Allow Spotify images
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.spotifycdn.com', // Add this new hostname
        port: '',
        pathname: '/**', // Or a more specific path if needed
      },
    ],
  },
};

export default nextConfig;
