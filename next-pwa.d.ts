declare module 'next-pwa' {
  import type { NextConfig } from 'next'

  interface PWAConfig {
    dest?: string
    register?: boolean
    skipWaiting?: boolean
    runtimeCaching?: Array<{
      urlPattern: RegExp
      handler: string
      options?: {
        cacheName?: string
        networkTimeoutSeconds?: number
        expiration?: {
          maxEntries?: number
          maxAgeSeconds?: number
        }
      }
    }>
    [key: string]: any
  }

  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig

  export default withPWA
}
