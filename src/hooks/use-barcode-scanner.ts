'use client'

import { useEffect, useRef, useState } from 'react'

export function useBarcodeScanner(onScan: (value: string, type: 'barcode' | 'sku') => void) {
    const [isScanning, setIsScanning] = useState(false)
    const bufferRef = useRef('')
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastScanTimeRef = useRef(0)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't process if typing in text inputs (except when focused on document)
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                const target = e.target as HTMLInputElement
                // Only allow scanning if input is for search, barcode, or sku
                const inputName = (target.name || target.placeholder || '').toLowerCase()
                const isSearchInput = inputName.includes('search') || inputName.includes('barcode') || inputName.includes('sku') || inputName.includes('scan')
                
                if (!isSearchInput && e.key !== 'Enter') {
                    return
                }
            }

            // Enter key or scan timeout triggers scan completion
            if (e.key === 'Enter') {
                e.preventDefault()
                if (bufferRef.current.length > 0) {
                    const now = Date.now()
                    // Prevent duplicate scans within 500ms
                    if (now - lastScanTimeRef.current > 500) {
                        setIsScanning(true)
                        const scannedValue = bufferRef.current.trim()
                        // Standard barcodes are 12-14 digits, SKUs vary
                        const type = /^\d{12,14}$/.test(scannedValue) ? 'barcode' : 'sku'
                        onScan(scannedValue, type)
                        bufferRef.current = ''
                        lastScanTimeRef.current = now
                        setTimeout(() => setIsScanning(false), 300)
                    }
                }
                return
            }

            // Build the string from printable characters
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                bufferRef.current += e.key

                // Clear existing timeout
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current)
                }

                // Set new timeout - barcode scanners input fast and usually end with Enter
                // But if we get a pause of 200ms and have a reasonable length, process it
                timeoutRef.current = setTimeout(() => {
                    if (bufferRef.current.length >= 5) {
                        const now = Date.now()
                        if (now - lastScanTimeRef.current > 500) {
                            setIsScanning(true)
                            const scannedValue = bufferRef.current.trim()
                            const type = /^\d{12,14}$/.test(scannedValue) ? 'barcode' : 'sku'
                            onScan(scannedValue, type)
                            bufferRef.current = ''
                            lastScanTimeRef.current = now
                            setTimeout(() => setIsScanning(false), 300)
                        }
                    } else {
                        bufferRef.current = ''
                    }
                }, 200)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [onScan])

    return { isScanning }
}
