'use client'

import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Helper function to get initial values
function getInitialValues() {
  // These can't be called on server, so they're safe to call here
  if (typeof window === 'undefined') {
    return { isIOS: false, isInstalled: false }
  }

  const userAgent = window.navigator.userAgent.toLowerCase()
  const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const isIOSStandalone = (navigator as { standalone?: boolean }).standalone === true
  const installed = isStandalone || isIOSStandalone

  return { isIOS: isIOSDevice, isInstalled: installed }
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [pwaState] = useState(getInitialValues())

  useEffect(() => {
    // Early return if already installed
    if (pwaState.isInstalled) {
      console.log('PWA already installed')
      return
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired')
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    console.log('PWA install prompt listener registered')

    // Log if service worker is registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        console.log('Service workers registered:', registrations.length)
      })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [pwaState.isInstalled])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDeferredPrompt(null)
  }

  // Don't show if already installed or no prompt
  if (!showPrompt || pwaState.isInstalled || !deferredPrompt) return null

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm border border-gray-200 dark:border-gray-700 z-50">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            Install Perfume POS
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {pwaState.isIOS
              ? 'Tap Share, then "Add to Home Screen" to install'
              : 'Install the app on your device for offline access and quick launching'}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>
      
      {!pwaState.isIOS && (
        <Button
          onClick={handleInstall}
          className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Download className="h-4 w-4" />
          Install App
        </Button>
      )}
    </div>
  )
}
