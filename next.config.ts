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
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
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

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
