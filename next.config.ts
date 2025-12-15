import type { NextConfig } from "next";
import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "https-calls",
        networkTimeoutSeconds: 15,
        expiration: {
          maxEntries: 150,
          maxAgeSeconds: 5 * 24 * 60 * 60, // 5 days
        },
      },
    },
    {
      urlPattern: /^http:\/\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "http-calls",
        networkTimeoutSeconds: 15,
        expiration: {
          maxEntries: 150,
          maxAgeSeconds: 5 * 24 * 60 * 60, // 5 days
        },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    resolveAlias: {},
  },
  experimental: {
    // Reduce memory usage
    optimizePackageImports: ["@radix-ui/*", "lucide-react"],
  },
};

export default pwaConfig(nextConfig);
