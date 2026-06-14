/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // google-play-scraper is an ESM package that should be loaded at runtime
    // by the Node server, not bundled by webpack.
    serverComponentsExternalPackages: ["google-play-scraper"],
  },
  images: {
    // App icons are served from Apple / Google CDNs.
    remotePatterns: [
      { protocol: "https", hostname: "**.mzstatic.com" },
      { protocol: "https", hostname: "**.ggpht.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
