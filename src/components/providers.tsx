'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { PWAInstallPrompt } from './pwa-install-prompt'
import { DeploymentSyncProvider } from './deployment-sync-provider'

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider 
            refetchInterval={0}
            refetchOnWindowFocus={false}
            refetchWhenOffline={false}
        >
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <DeploymentSyncProvider />
                {children}
                <PWAInstallPrompt />
            </ThemeProvider>
        </SessionProvider>
    )
}
