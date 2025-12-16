import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Perfume POS System",
  description: "Professional Point of Sale System for Perfume Retail",
  manifest: "/manifest.json",
  metadataBase: new URL("http://localhost:3000"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Perfume POS",
  },
  formatDetection: {
    telephone: false,
  },
  icons: [
    { rel: "icon", url: "/icon-192.png", sizes: "192x192" },
    { rel: "icon", url: "/icon-512.png", sizes: "512x512" },
    { rel: "apple-touch-icon", url: "/icon-192.png", sizes: "192x192" },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#1f2937" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#111827" media="(prefers-color-scheme: dark)" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Perfume POS" />
        <meta name="application-name" content="Perfume POS" />
        <meta name="msapplication-TileColor" content="#1f2937" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/icon-192.png" />
        <meta name="description" content="Professional Point of Sale System for Perfume Retail" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster position="top-right" richColors />
        <script>
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(
                  (registration) => {
                    console.log('ServiceWorker registration successful:', registration);
                  },
                  (err) => {
                    console.error('ServiceWorker registration failed:', err);
                  }
                );
              });
            } else {
              console.warn('Service Workers not supported');
            }
            
            // Log PWA installation checks
            console.log('PWA Install Check:');
            console.log('Manifest:', document.querySelector('link[rel="manifest"]')?.href);
            console.log('Service Worker Ready:', 'serviceWorker' in navigator);
            console.log('Display Mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
          `}
        </script>
      </body>
    </html>
  );
}
