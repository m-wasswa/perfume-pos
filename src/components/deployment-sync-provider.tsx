'use client'

import { useEffect } from 'react'
import { initDeploymentSync } from '@/lib/utils/deployment-sync'

/**
 * Component that initializes deployment sync tracking
 * Ensures client/server stay in sync after deployments
 */
export function DeploymentSyncProvider() {
    useEffect(() => {
        // Initialize deployment sync on mount
        initDeploymentSync()
    }, [])

    return null
}
