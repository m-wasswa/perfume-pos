/**
 * Safe wrapper for server actions that handles hash mismatch errors
 * When server actions get out of sync, this will attempt to reload and retry
 */

import { handleServerActionError } from './deployment-sync'

export class ServerActionError extends Error {
    constructor(
        message: string,
        public code: string,
        public isHashMismatch: boolean = false
    ) {
        super(message)
        this.name = 'ServerActionError'
    }
}

/**
 * Detects if error is a server action hash mismatch
 */
export function isServerActionHashMismatch(error: unknown): boolean {
    if (error instanceof Error) {
        return error.message.includes('Failed to find Server Action') ||
               error.message.includes('deployment') ||
               (error as any).code === 'NEXT_SERVER_ACTION_NOT_FOUND'
    }
    return false
}

/**
 * Performs a hard page reload to sync client and server
 */
export function hardReload(): void {
    // Use location.reload with cache busting
    window.location.href = window.location.href + (window.location.href.includes('?') ? '&' : '?') + `_t=${Date.now()}`
}

/**
 * Safe wrapper for server action calls with automatic recovery
 */
export async function safeServerAction<T>(
    action: () => Promise<T>,
    options: {
        maxRetries?: number
        onHashMismatch?: () => void
        actionName?: string
    } = {}
): Promise<T> {
    const { maxRetries = 2, onHashMismatch, actionName = 'action' } = options
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await action()
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))

            // Check for hash mismatch error
            if (isServerActionHashMismatch(error)) {
                console.warn(`[Server Action] Hash mismatch detected for ${actionName}. Starting recovery...`)

                if (onHashMismatch) {
                    onHashMismatch()
                }

                // Handle the hash mismatch - this will hard reload
                await handleServerActionError(error)

                // This code won't be reached due to hard reload, but for type safety
                await new Promise(resolve => setTimeout(resolve, 1000))
            }

            // If not the last attempt, retry with exponential backoff
            if (attempt < maxRetries - 1) {
                const delay = 500 * Math.pow(2, attempt)
                console.log(`[Server Action] Retry ${attempt + 1}/${maxRetries - 1} after ${delay}ms`)
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
    }

    throw new ServerActionError(
        lastError?.message || `${actionName} failed`,
        'SERVER_ACTION_FAILED',
        isServerActionHashMismatch(lastError)
    )
}

/**
 * Wrapper for read operations (like getProducts) with fallback
 */
export async function safeReadAction<T>(
    action: () => Promise<T>,
    actionName: string = 'read'
): Promise<T> {
    return safeServerAction(action, {
        maxRetries: 3,
        actionName
    })
}

/**
 * Wrapper for write operations (like delete, update) with stricter error handling
 */
export async function safeWriteAction<T>(
    action: () => Promise<T>,
    actionName: string = 'write'
): Promise<T> {
    return safeServerAction(action, {
        maxRetries: 2,
        actionName
    })
}
