'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Scan, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface ScannedProduct {
    sku: string
    quantity: number
    scannedAt: Date
}

interface ProductInfo {
    id?: string
    brand: string
    name: string
    category: string
    size: string
    type: string
    sku: string
    retailPrice: number
    wholesalePrice: number
}

export default function BarcodeScanPage() {
    const router = useRouter()
    const videoRef = useRef<HTMLVideoElement>(null)
    const [cameraActive, setCameraActive] = useState(false)
    const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([])
    const [manualSKU, setManualSKU] = useState('')
    const [manualQuantity, setManualQuantity] = useState('1')
    const [productDetails, setProductDetails] = useState<{ [key: string]: ProductInfo }>({})
    const [isLoading, setIsLoading] = useState(false)

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            })

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                setCameraActive(true)
            }
        } catch (error) {
            toast.error('Unable to access camera. Please check permissions.')
        }
    }

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
            tracks.forEach(track => track.stop())
            setCameraActive(false)
        }
    }

    const captureFrame = async () => {
        if (!videoRef.current) return

        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(videoRef.current, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg')

        // In a real app, you would send this to a barcode detection API
        // For now, we'll show a placeholder
        toast.info('Frame captured - barcode detection coming soon')
    }

    const addScannedProduct = async (sku: string) => {
        if (!sku.trim()) {
            toast.error('Please enter a valid SKU')
            return
        }

        setIsLoading(true)

        try {
            // Fetch product details from the database
            const response = await fetch(`/api/products/by-sku/${encodeURIComponent(sku)}`)

            if (!response.ok) {
                toast.error('Product not found. Please check the SKU.')
                setIsLoading(false)
                return
            }

            const data = await response.json()

            if (data.success && data.variant) {
                const existing = scannedProducts.find(p => p.sku === sku)

                if (existing) {
                    setScannedProducts(scannedProducts.map(p =>
                        p.sku === sku ? { ...p, quantity: p.quantity + 1 } : p
                    ))
                } else {
                    setScannedProducts([...scannedProducts, {
                        sku,
                        quantity: 1,
                        scannedAt: new Date()
                    }])
                }

                setProductDetails({
                    ...productDetails,
                    [sku]: {
                        brand: data.product.brand,
                        name: data.product.name,
                        category: data.product.category,
                        size: data.variant.size,
                        type: data.variant.type,
                        sku: data.variant.sku,
                        retailPrice: data.variant.retailPrice,
                        wholesalePrice: data.variant.wholesalePrice,
                    }
                })

                toast.success(`Added ${data.product.brand} ${data.product.name}`)
                setManualSKU('')
                setManualQuantity('1')
            } else {
                toast.error('Product not found')
            }
        } catch (error) {
            toast.error('Failed to fetch product details')
        } finally {
            setIsLoading(false)
        }
    }

    const removeProduct = (sku: string) => {
        setScannedProducts(scannedProducts.filter(p => p.sku !== sku))
        const newDetails = { ...productDetails }
        delete newDetails[sku]
        setProductDetails(newDetails)
    }

    const updateQuantity = (sku: string, quantity: number) => {
        if (quantity <= 0) {
            removeProduct(sku)
        } else {
            setScannedProducts(scannedProducts.map(p =>
                p.sku === sku ? { ...p, quantity } : p
            ))
        }
    }

    const clearAll = () => {
        setScannedProducts([])
        setProductDetails({})
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <Link href="/admin/products">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold dark:text-white">Barcode Scanner</h1>
                    <p className="text-gray-500 dark:text-gray-400">Scan barcodes or enter SKUs to add products</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Scanner & Input */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Camera Section */}
                    <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                        <h2 className="text-xl font-semibold mb-4 dark:text-white">Camera Scanner</h2>

                        {cameraActive ? (
                            <div className="space-y-4">
                                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 border-2 border-yellow-400 opacity-50 flex items-center justify-center">
                                        <div className="border-4 border-yellow-400 w-48 h-48 rounded-lg" />
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        className="flex-1 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                        onClick={captureFrame}
                                    >
                                        <Scan className="h-4 w-4 mr-2" />
                                        Capture
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="flex-1"
                                        onClick={stopCamera}
                                    >
                                        Stop Camera
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-8 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
                                    <Scan className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                                    <p className="text-gray-600 dark:text-gray-300">Camera is not active</p>
                                </div>
                                <Button
                                    onClick={startCamera}
                                    size="lg"
                                    className="w-full"
                                >
                                    <Scan className="h-5 w-5 mr-2" />
                                    Start Camera Scanner
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* Manual Input */}
                    <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                        <h2 className="text-xl font-semibold mb-4 dark:text-white">Manual Entry</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 dark:text-gray-200">SKU / Barcode</label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter SKU or scan barcode..."
                                        value={manualSKU}
                                        onChange={(e) => setManualSKU(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                addScannedProduct(manualSKU)
                                            }
                                        }}
                                        disabled={isLoading}
                                        autoFocus
                                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                    <Button
                                        onClick={() => addScannedProduct(manualSKU)}
                                        disabled={isLoading || !manualSKU.trim()}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Press Enter or click the + button to add
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Scanned Products List */}
                    {scannedProducts.length > 0 && (
                        <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold dark:text-white">
                                    Scanned Products ({scannedProducts.length})
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAll}
                                    className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    Clear All
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {scannedProducts.map((product) => {
                                    const details = productDetails[product.sku]
                                    return (
                                        <div key={product.sku} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold dark:text-white">
                                                        {details?.brand} {details?.name}
                                                    </h3>
                                                    <div className="flex items-center gap-4 mt-1 text-sm dark:text-gray-300">
                                                        <span>{details?.size} {details?.type}</span>
                                                        <span className="text-gray-500 dark:text-gray-400">SKU: {product.sku}</span>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeProduct(product.sku)}
                                                    className="text-red-600 dark:text-red-400"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="text-sm dark:text-gray-300">
                                                    <span className="font-medium">₦{details?.retailPrice.toLocaleString()}</span>
                                                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                                                        @ ₦{details?.wholesalePrice.toLocaleString()} wholesale
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updateQuantity(product.sku, product.quantity - 1)}
                                                        className="dark:border-gray-600 dark:text-gray-300"
                                                    >
                                                        −
                                                    </Button>
                                                    <span className="w-12 text-center font-semibold dark:text-white">
                                                        {product.quantity}
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updateQuantity(product.sku, product.quantity + 1)}
                                                        className="dark:border-gray-600 dark:text-gray-300"
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Stats */}
                    <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Total Items:</span>
                                <span className="font-semibold dark:text-white">{scannedProducts.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Total Units:</span>
                                <span className="font-semibold dark:text-white">
                                    {scannedProducts.reduce((sum, p) => sum + p.quantity, 0)}
                                </span>
                            </div>
                            <div className="pt-3 border-t dark:border-gray-600">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Est. Retail:</span>
                                    <span className="font-semibold dark:text-white">
                                        ₦{scannedProducts.reduce((sum, p) => {
                                            const details = productDetails[p.sku]
                                            return sum + (details?.retailPrice || 0) * p.quantity
                                        }, 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between mt-2">
                                    <span className="text-gray-600 dark:text-gray-400">Est. Wholesale:</span>
                                    <span className="font-semibold dark:text-white">
                                        ₦{scannedProducts.reduce((sum, p) => {
                                            const details = productDetails[p.sku]
                                            return sum + (details?.wholesalePrice || 0) * p.quantity
                                        }, 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Tips */}
                    <Card className="p-6 dark:bg-blue-900/20 dark:border-blue-700 border border-blue-200">
                        <div className="flex items-start space-x-2 mb-3">
                            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <h3 className="font-semibold text-blue-900 dark:text-blue-300">Tips</h3>
                        </div>
                        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                            <li>• Use a barcode scanner app for faster scanning</li>
                            <li>• Enter SKU manually if barcode is damaged</li>
                            <li>• Adjust quantities using +/− buttons</li>
                            <li>• Products must be added to system first</li>
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    )
}
