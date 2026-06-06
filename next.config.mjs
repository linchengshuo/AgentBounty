/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "wagmi/chains$": "viem/chains",
      "@react-native-async-storage/async-storage": false, // 这个包只给 React Native App 用；Web 端不打包它，避免 MetaMask SDK 可选依赖 warning。
    };

    return config;
  },
};

export default nextConfig;
