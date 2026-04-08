import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow next/image to optimise profile photos served from the API backend.
  // Add additional hostname entries as needed for CDN / storage providers.
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: process.env.CDN_HOSTNAME ?? "your-cdn.example.com",
        pathname: "/**",
      },
    ],
  },

  // Prevent socket.io-client and its sub-deps from being bundled into the
  // server bundle — they access browser globals at module evaluation time
  // which crashes RSC payload rendering for every dashboard route.
  serverExternalPackages: [
    "socket.io-client",
    "engine.io-client",
    "xmlhttprequest-ssl",
  ],
};

export default nextConfig;
