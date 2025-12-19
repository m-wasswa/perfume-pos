/**
 * Service Worker cache management and deployment sync
 * Ensures client stays in sync with server deployment
 * 
 * IMPORTANT: This file is client-side only and must never be imported on server
 */

'use client'

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined'

// Cache version - increment this to invalidate all caches
const CACHE_VERSION = 'v1'
const CACHE_NAMES = {
    STATIC: `static-${CACHE_VERSION}`,
    DYNAMIC: `dynamic-${CACHE_VERSION}`,
    API: `api-${CACHE_VERSION}`
}

// Deployment tracking - detect when server has new version
let deploymentId = isBrowser ? (localStorage.getItem('deployment_id') || Date.now().toString()) : 'server-side'

// Check if deployment has changed
async function checkDeploymentSync() {
    if (!isBrowser) return

    try {
        const response = await fetch('/api/auth/session', {
            cache: 'no-store',
            headers: { 'x-check-deployment': '1' }
        })

        const currentDeploymentId = response.headers.get('x-deployment-id') || deploymentId

        if (currentDeploymentId !== deploymentId) {
            console.warn('[Sync] Deployment changed detected. Clearing caches and reloading...')
            deploymentId = currentDeploymentId
            if (isBrowser) {
                localStorage.setItem('deployment_id', deploymentId)
            }

            // Clear all caches
            if ('caches' in window) {
                const cacheNames = await caches.keys()
                await Promise.all(
                    cacheNames.map(name => caches.delete(name))
                )
            }

            // Force hard reload
            hardReload()
        }
    } catch (error) {
        console.error('[Sync] Error checking deployment:', error)
    }
}

// Force hard reload with cache busting
export function hardReload() {
    if (!isBrowser) return

    // Clear service worker cache
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
    }

    // Force full page reload with cache busting
    const timestamp = Date.now()
    window.location.href = window.location.pathname + `?_bust=${timestamp}#force-reload`
}

// Run sync check periodically
export function initDeploymentSync() {
    if (!isBrowser) return

    // Check on page load
    checkDeploymentSync()

    // Check every 30 seconds
    setInterval(checkDeploymentSync, 30000)

    // Check on page visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkDeploymentSync()
        }
    })
}

// Clear all application caches
export async function clearAllCaches() {
    if (!isBrowser) return false

    try {
        if ('caches' in window) {
            const cacheNames = await caches.keys()
            await Promise.all(
                cacheNames.map(name => caches.delete(name))
            )
            console.log('[Cache] Cleared all caches')
        }

        // Clear localStorage
        try {
            localStorage.clear()
        } catch (e) {
            console.warn('Could not clear localStorage:', e)
        }

        // Clear sessionStorage
        try {
            sessionStorage.clear()
        } catch (e) {
            console.warn('Could not clear sessionStorage:', e)
        }

        return true
    } catch (error) {
        console.error('[Cache] Error clearing caches:', error)
        return false
    }
}

// Handle server action errors with recovery
export async function handleServerActionError(error: any) {
    if (!isBrowser) return false

    const isHashMismatch = error?.message?.includes('Failed to find Server Action')

    if (isHashMismatch) {
        console.error('[ServerAction] Hash mismatch detected. Starting recovery...')

        // Clear caches
        await clearAllCaches()

        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 500))

        // Hard reload
        hardReload()
    }

    return isHashMismatch
}
