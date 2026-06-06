/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "wagmi/chains$": "viem/chains",
    };

    return config;
  },
};

export default nextConfig;
