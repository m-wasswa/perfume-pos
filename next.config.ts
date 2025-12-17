import type { NextConfig } from "next";
import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: false,
  publicExclude: ["!noprecache"],
  buildExcludes: [/middleware-manifest.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-webfonts",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "cdn-cache",
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "next-image",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\/uploads\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "uploaded-images",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "https-calls",
        networkTimeoutSeconds: 15,
        expiration: {
          maxEntries: 150,
          maxAgeSeconds: 5 * 24 * 60 * 60,
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
          maxAgeSeconds: 5 * 24 * 60 * 60,
        },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    optimizePackageImports: ["@radix-ui/*", "lucide-react"],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'perfumepos.invetotrack.online',
      },
    ],
    unoptimized: true,
  },
};

export default pwaConfig(nextConfig);
