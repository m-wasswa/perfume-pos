'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, Trash2, Search, Scan } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/formatters'
import BarcodeScannerModal from '@/components/barcode-scanner-modal'

interface ReceiveItem {
    variantId: string
    quantity: number
    wholesalePrice: number
    vendor: string
    manufactureDate?: string
    productDetails?: {
        brand: string
        name: string
        size: string
        type: string
        sku: string
    }
}

interface ProductVariant {
    id: string
    sku: string
    size: string
    type: string
    product: {
        id: string
        brand: string
        name: string
    }
}

export default function ReceiveStockPage() {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [products, setProducts] = useState<ProductVariant[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isScannerOpen, setIsScannerOpen] = useState(false)

    const searchProducts = async (query: string) => {
        if (!query.trim()) {
            setProducts([])
            return
        }

        setIsSearching(true)
        try {
            const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`)
            const data = await response.json()

            if (data.success && data.variants) {
                setProducts(data.variants)
            } else {
                setProducts([])
                toast.error('No products found')
            }
        } catch (error) {
            toast.error('Failed to search products')
        } finally {
            setIsSearching(false)
        }
    }

    const handleBarcodeScanned = async (barcode: string) => {
        // Search for product by barcode
        setIsSearching(true)
        try {
            const response = await fetch(`/api/products/by-barcode/${encodeURIComponent(barcode)}`)
            const data = await response.json()

            if (data.success && data.variant) {
                addItem(data.variant)
                toast.success(`Added: ${data.variant.product.brand} ${data.variant.product.name}`)
            } else {
                toast.error('Product with this barcode not found')
            }
        } catch (error) {
            toast.error('Failed to find product by barcode')
        } finally {
            setIsSearching(false)
        }
    }

    const addItem = (variant: ProductVariant) => {
        const exists = receiveItems.find(item => item.variantId === variant.id)

        if (exists) {
            toast.info('Product already added')
            return
        }

        setReceiveItems([...receiveItems, {
            variantId: variant.id,
            quantity: 1,
            wholesalePrice: 0,
            vendor: '',
            productDetails: {
                brand: variant.product.brand,
                name: variant.product.name,
                size: variant.size,
                type: variant.type,
                sku: variant.sku,
            }
        }])

        setSearchQuery('')
        setProducts([])
    }

    const updateItem = (index: number, updates: Partial<ReceiveItem>) => {
        setReceiveItems(receiveItems.map((item, i) =>
            i === index ? { ...item, ...updates } : item
        ))
    }

    const removeItem = (index: number) => {
        setReceiveItems(receiveItems.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        if (receiveItems.length === 0) {
            toast.error('Please add at least one item')
            return
        }

        const invalidItems = receiveItems.filter(item =>
            item.quantity <= 0 || item.wholesalePrice <= 0 || !item.vendor.trim()
        )

        if (invalidItems.length > 0) {
            toast.error('Please fill in all required fields for all items')
            return
        }

        setIsSubmitting(true)

        try {
            const response = await fetch('/api/admin/receive-stock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ items: receiveItems }),
            })

            const result = await response.json()

            if (result.success) {
                toast.success(`Successfully received ${receiveItems.length} product(s)`)
                setReceiveItems([])
                // Add timestamp to force page refresh
                setTimeout(() => router.push('/admin/inventory?refresh=' + Date.now()), 1500)
            } else {
                toast.error(result.error || 'Failed to receive stock')
            }
        } catch (error) {
            toast.error('Failed to submit stock receipt')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <Link href="/admin/inventory">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold dark:text-white">Receive Stock</h1>
                    <p className="text-gray-500 dark:text-gray-400">Add new inventory to your stock</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Search & Add */}
                    <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                        <h2 className="text-xl font-semibold mb-4 dark:text-white">Add Products</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 dark:text-gray-200">Search Product</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Search by brand, name, or SKU..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value)
                                                searchProducts(e.target.value)
                                            }}
                                            disabled={isSearching}
                                            className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <Button
                                        onClick={() => setIsScannerOpen(true)}
                                        variant="outline"
                                        size="icon"
                                        className="dark:bg-gray-700 dark:border-gray-600"
                                        title="Scan barcode"
                                    >
                                        <Scan className="h-4 w-4" />
                                    </Button>
                                </div>

                                {products.length > 0 && (
                                    <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                                        {products.map((product) => (
                                            <button
                                                key={product.id}
                                                onClick={() => addItem(product)}
                                                className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-600 border-b dark:border-gray-600 last:border-0 transition"
                                            >
                                                <div className="font-medium dark:text-white">
                                                    {product.product.brand} {product.product.name}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {product.size} {product.type} • SKU: {product.sku}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Items List */}
                    {receiveItems.length > 0 && (
                        <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                            <h2 className="text-xl font-semibold mb-4 dark:text-white">Items to Receive</h2>

                            <div className="space-y-6">
                                {receiveItems.map((item, index) => {
                                    return (
                                        <div key={index} className="p-4 bg-gradient-to-br from-blue-50 to-blue-50 dark:from-gray-700 dark:to-gray-700/80 rounded-lg border border-blue-200 dark:border-blue-900">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-lg dark:text-white">Item #{index + 1}</h3>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeItem(index)}
                                                    className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" /> Remove
                                                </Button>
                                            </div>

                                            {/* Product Details Section */}
                                            <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border-l-4 border-blue-500">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-semibold">PRODUCT DETAILS</p>
                                                {item.productDetails ? (
                                                    <>
                                                        <p className="text-sm dark:text-gray-200">
                                                            <span className="font-medium">Brand:</span> {item.productDetails.brand}
                                                        </p>
                                                        <p className="text-sm dark:text-gray-200">
                                                            <span className="font-medium">Product:</span> {item.productDetails.name}
                                                        </p>
                                                        <p className="text-sm dark:text-gray-200">
                                                            <span className="font-medium">Size:</span> {item.productDetails.size}
                                                        </p>
                                                        <p className="text-sm dark:text-gray-200">
                                                            <span className="font-medium">Type:</span> {item.productDetails.type}
                                                        </p>
                                                        <p className="text-sm dark:text-gray-200">
                                                            <span className="font-medium">SKU:</span> {item.productDetails.sku}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Variant ID: {item.variantId}</p>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2 dark:text-gray-200">Quantity *</label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 0 })}
                                                        placeholder="0"
                                                        className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-2 dark:text-gray-200">Wholesale Price *</label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.wholesalePrice}
                                                        onChange={(e) => updateItem(index, { wholesalePrice: parseFloat(e.target.value) || 0 })}
                                                        placeholder="0.00"
                                                        className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-2 dark:text-gray-200">Vendor *</label>
                                                    <Input
                                                        value={item.vendor}
                                                        onChange={(e) => updateItem(index, { vendor: e.target.value })}
                                                        placeholder="e.g., Supplier Name"
                                                        className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-2 dark:text-gray-200">Manufacture Date</label>
                                                    <Input
                                                        type="date"
                                                        value={item.manufactureDate || ''}
                                                        onChange={(e) => updateItem(index, { manufactureDate: e.target.value })}
                                                        className="dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                    />
                                                </div>
                                            </div>

                                            {/* Cost Summary */}
                                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                                                <div className="grid grid-cols-3 gap-4 text-center">
                                                    <div>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">Unit Cost</p>
                                                        <p className="text-lg font-bold text-green-700 dark:text-green-400">
                                                            {formatCurrency(item.wholesalePrice)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">Quantity</p>
                                                        <p className="text-lg font-bold text-green-700 dark:text-green-400">{item.quantity}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">Total Cost</p>
                                                        <p className="text-lg font-bold text-green-700 dark:text-green-400">
                                                            {formatCurrency(item.quantity * item.wholesalePrice)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border dark:border-blue-700">
                                                <p className="text-sm font-medium dark:text-blue-300">
                                                    Total Cost: {formatCurrency(item.quantity * item.wholesalePrice)}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="mt-6 pt-6 border-t dark:border-gray-600 flex gap-3">
                                <Link href="/admin/inventory" className="flex-1">
                                    <Button variant="outline" className="w-full dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex-1"
                                >
                                    {isSubmitting ? 'Processing...' : 'Receive Stock'}
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Summary */}
                {receiveItems.length > 0 && (
                    <Card className="p-6 dark:bg-gray-800 dark:border-gray-700 h-fit">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">Summary</h3>

                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Total Items:</span>
                                <span className="font-semibold dark:text-white">{receiveItems.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Total Units:</span>
                                <span className="font-semibold dark:text-white">
                                    {receiveItems.reduce((sum, item) => sum + item.quantity, 0)}
                                </span>
                            </div>
                            <div className="pt-3 border-t dark:border-gray-600">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Total Cost:</span>
                                    <span className="font-bold text-lg dark:text-white">
                                        {formatCurrency(receiveItems.reduce((sum, item) => sum + (item.quantity * item.wholesalePrice), 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Barcode Scanner Modal */}
            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={handleBarcodeScanned}
                variantIndex={0}
            />
        </div>
    )
}
