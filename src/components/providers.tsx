'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { PWAInstallPrompt } from './pwa-install-prompt'

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                {children}
                <PWAInstallPrompt />
            </ThemeProvider>
        </SessionProvider>
    )
}
