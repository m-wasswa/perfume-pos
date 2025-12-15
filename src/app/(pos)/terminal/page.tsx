'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'
import { useCartStore } from '@/store/cart-store'
import { getProductBySKU, getProducts } from '@/lib/actions/products'
import { createOrder } from '@/lib/actions/orders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import BarcodeScannerModal from '@/components/barcode-scanner-modal'
import {
    ShoppingCart,
    Trash2,
    CreditCard,
    Banknote,
    Smartphone,
    Search,
    Loader2,
    Package,
    LayoutDashboard,
    Scan
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/formatters'

export default function POSTerminal() {
    const { data: session } = useSession()
    const router = useRouter()
    const [isProcessing, setIsProcessing] = useState(false)
    const [showCart, setShowCart] = useState(false) // Mobile cart visibility
    const [taxRate, setTaxRate] = useState(0.18) // Default 18%, will be updated from settings
    const [searchQuery, setSearchQuery] = useState('')
    const [allProducts, setAllProducts] = useState<any[]>([])
    const [filteredProducts, setFilteredProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [lastScannedBarcode, setLastScannedBarcode] = useState('')
    const [barcodeInput, setBarcodeInput] = useState('')
    const [lastAddedProduct, setLastAddedProduct] = useState<any>(null)
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const cart = useCartStore()

    // Load settings and products on mount
    useEffect(() => {
        loadSettings()
        loadProducts()
    }, [])

    const loadSettings = async () => {
        try {
            const response = await fetch('/api/settings')
            if (response.ok) {
                const data = await response.json()
                if (data.store?.taxRate !== undefined && data.store?.taxRate !== null) {
                    setTaxRate(data.store.taxRate)
                }
            }
        } catch (error) {
            console.error('Failed to load settings:', error)
        }
    }

    const loadProducts = async () => {
        setLoading(true)
        // Pass -1 to fetch all products for POS terminal
        const result = await getProducts(1, -1)
        if (result.success && result.products) {
            setAllProducts(result.products)
            setFilteredProducts(result.products)
        }
        setLoading(false)
    }

    // Filter products based on search
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredProducts(allProducts)
        } else {
            const query = searchQuery.toLowerCase()
            const filtered = allProducts.filter(product =>
                product.brand.toLowerCase().includes(query) ||
                product.name.toLowerCase().includes(query) ||
                product.category.toLowerCase().includes(query)
            )
            setFilteredProducts(filtered)
        }
    }, [searchQuery, allProducts])

    const handleBarcodeSubmit = async (barcode: string) => {
        if (!barcode.trim()) return
        
        try {
            setLastScannedBarcode(barcode)
            let result
            
            // Try barcode first
            const { getProductByBarcode } = await import('@/lib/actions/products')
            result = await getProductByBarcode(barcode)
            
            // If not found, try SKU
            if (!result.success || !result.variant) {
                result = await getProductBySKU(barcode)
            }

            if (!result.success || !result.variant) {
                toast.error(`Product not found`)
                setBarcodeInput('')
                return
            }

            const variant = result.variant
            const product = variant.product

            // Add to cart
            addProductToCart(variant, product)
            setLastAddedProduct({ ...product, variant })
            setIsScannerOpen(false)
            
            // Clear input and show success
            setBarcodeInput('')
            
            // Clear the last added display after 2 seconds
            setTimeout(() => {
                setLastAddedProduct(null)
                setLastScannedBarcode('')
            }, 2000)
        } catch (error) {
            console.error('Barcode error:', error)
            toast.error('Error processing barcode')
            setBarcodeInput('')
        }
    }

    const handleScan = async (value: string, type: 'barcode' | 'sku') => {
        await handleBarcodeSubmit(value)
    }

    const { isScanning } = useBarcodeScanner(handleScan)

    const addProductToCart = (variant: any, product: any) => {
        const stock = variant.inventory?.[0]?.quantity || 0
        
        if (stock <= 0) {
            toast.error('Product out of stock')
            return
        }

        cart.addItem({
            id: variant.id,
            variantId: variant.id,
            sku: variant.sku,
            productName: `${product.brand} ${product.name}`,
            variantDetails: `${variant.size} ${variant.type}`,
            quantity: 1,
            unitPrice: variant.retailPrice,
            totalPrice: variant.retailPrice,
            isTester: variant.isTester,
            imageUrl: (product as any).imageUrl || undefined
        })

        // Show warning if stock is low
        if (stock <= 5) {
            toast.warning(`Only ${stock} unit(s) left in stock`)
        } else {
            toast.success('Item added to cart')
        }
    }

    const handleCheckout = async (paymentMethod: 'CASH' | 'CARD' | 'MOBILE') => {
        if (cart.items.length === 0) {
            toast.error('Cart is empty')
            return
        }

        setIsProcessing(true)

        const result = await createOrder({
            items: cart.items.map(item => ({
                variantId: item.variantId,
                quantity: item.quantity,
                unitPrice: item.unitPrice
            })),
            customerId: cart.customerId || undefined,
            discount: cart.discount,
            paymentMethod,
            notes: cart.notes
        })

        setIsProcessing(false)

        if (result.success) {
            toast.success('Order completed successfully')
            cart.clearCart()

            // Print receipt (PDF in development, physical printer in production)
            if (result.order) {
                try {
                    const isDevelopment = process.env.NODE_ENV === 'development'

                    if (isDevelopment) {
                        // Generate PDF receipt in development
                        const response = await fetch('/api/print/pdf-receipt', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orderId: result.order.id })
                        })

                        if (response.ok) {
                            const { receipt } = await response.json()
                            const { generateReceiptPDF } = await import('@/lib/utils/pdf-receipt')
                            generateReceiptPDF(receipt)
                            toast.success('Receipt downloaded as PDF')
                        }
                    } else {
                        // Use physical printer in production
                        await fetch('/api/print/receipt', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orderId: result.order.id })
                        })
                    }
                } catch (printError) {
                    console.error('Print error:', printError)
                    // Don't show error to user, printing is optional
                }
            }
        } else {
            toast.error(result.error || 'Order failed')
        }
    }

    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-50 dark:bg-gray-900">
            {/* Admin Button - Top Right */}
            {session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER' ? (
                <div className="absolute top-4 right-4 z-10 md:right-4">
                    <Button
                        onClick={() => router.push('/admin/dashboard')}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-xs md:text-sm px-2 md:px-4 py-1 md:py-2"
                    >
                        <LayoutDashboard className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="hidden sm:inline">Admin Dashboard</span>
                        <span className="sm:hidden">Admin</span>
                    </Button>
                </div>
            ) : null}

            {/* Left Panel - Products Catalog */}
            <div className="flex-1 flex flex-col p-2 md:p-4 space-y-2 md:space-y-4 overflow-hidden md:border-r dark:md:border-gray-700">
                {/* Barcode Scanner Button */}
                <Button
                    onClick={() => setIsScannerOpen(true)}
                    className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2 md:py-3"
                >
                    <Scan className="h-4 w-4 md:h-5 md:w-5" />
                    <span>Scan Barcode</span>
                </Button>

                {/* Last Added Product - Highlight */}
                {lastAddedProduct && (
                    <div className="bg-green-100 dark:bg-green-900 border-2 border-green-500 dark:border-green-600 p-3 md:p-4 rounded-lg animate-pulse">
                        <p className="text-sm md:text-base font-bold text-green-800 dark:text-green-200">✓ Added to Cart!</p>
                        <p className="text-xs md:text-sm text-green-700 dark:text-green-300 mt-1">
                            {lastAddedProduct.brand} {lastAddedProduct.name} - {lastAddedProduct.variant.size}
                        </p>
                    </div>
                )}

                {/* Search Bar */}
                <Card className="p-2 md:p-4 dark:bg-gray-800 dark:border-gray-700">
                    <div className="relative">
                        <Search className="absolute left-2 md:left-3 top-2 md:top-3 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                        <Input
                            placeholder="Search..."
                            className="pl-7 md:pl-10 text-xs md:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </Card>

                {/* Mobile Cart Button */}
                <div className="md:hidden flex gap-2">
                    <Button
                        onClick={() => setShowCart(!showCart)}
                        className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-xs py-2"
                    >
                        <ShoppingCart className="h-4 w-4" />
                        Cart ({cart.items.length})
                    </Button>
                </div>

                {/* Products Grid */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                            <Package className="h-10 w-10 md:h-12 md:w-12 mb-2 opacity-50" />
                            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">No products found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                            {filteredProducts.map((product) => (
                                <div key={product.id} className="rounded-lg overflow-hidden bg-white dark:bg-gray-800 hover:shadow-xl transition-all cursor-pointer group border border-gray-200 dark:border-gray-700">
                                    {/* Image section - no padding */}
                                    <div className="relative">
                                        {product.imageUrl && (
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="w-full h-24 md:h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        )}
                                        <Badge className="absolute top-1 right-1 md:top-2 md:right-2 bg-pink-500 hover:bg-pink-600 text-white border-0 text-xs">
                                            {product.category}
                                        </Badge>
                                    </div>

                                    {/* Content section - directly below image */}
                                    <div className="p-2 md:p-3">
                                        <h3 className="font-bold text-gray-900 dark:text-white text-xs md:text-sm mb-1">
                                            {product.brand} {product.name}
                                        </h3>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 md:mb-3 line-clamp-1">
                                            {product.description || 'Premium fragrance'}
                                        </p>

                                        {/* Price and stock buttons */}
                                        <div className="space-y-1.5">
                                            {product.variants?.map((variant: any) => {
                                                const stock = variant.inventory?.[0]?.quantity || 0
                                                const isOutOfStock = stock <= 0
                                                
                                                return (
                                                    <button
                                                        key={variant.id}
                                                        onClick={() => !isOutOfStock && addProductToCart(variant, product)}
                                                        disabled={isOutOfStock}
                                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                                                            isOutOfStock
                                                                ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                                                : 'bg-blue-600 hover:bg-blue-700'
                                                        }`}
                                                    >
                                                        <div className="flex flex-col gap-0.5 flex-1">
                                                            <span className="text-xs font-semibold text-white">{variant.size}</span>
                                                            <span className={`text-xs font-medium ${isOutOfStock ? 'text-white' : 'text-blue-100'}`}>
                                                                {isOutOfStock ? 'Out of Stock' : `Stock: ${stock}`}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm font-bold text-white">
                                                            {formatCurrency(variant.retailPrice)}
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Cart & Checkout (Hidden on Mobile unless showCart is true) */}
            <div className={`${showCart ? 'block' : 'hidden'} md:block w-full md:w-96 bg-white dark:bg-gray-800 md:border-l dark:md:border-gray-700 flex flex-col ${showCart ? 'fixed md:relative inset-0 z-50' : 'border-t md:border-t-0 dark:border-gray-700 md:dark:border-t-0'}`}>
                {/* Close button on mobile */}
                {showCart && (
                    <div className="p-2 border-b dark:border-gray-700 flex justify-between items-center md:hidden">
                        <h2 className="text-lg font-semibold dark:text-white">Cart</h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCart(false)}
                            className="text-gray-600 dark:text-gray-400"
                        >
                            ✕
                        </Button>
                    </div>
                )}

                {/* Cart Header */}
                <div className="p-3 md:p-4 border-b dark:border-gray-700 hidden md:block">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg md:text-xl font-semibold flex items-center dark:text-white">
                            <ShoppingCart className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                            Cart ({cart.items.length})
                        </h2>
                        {cart.items.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cart.clearCart()}
                                className="dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-auto min-h-0">
                    {cart.items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 p-4 md:p-8">
                            <ShoppingCart className="h-12 md:h-16 w-12 md:w-16 mb-2 md:mb-3 opacity-50" />
                            <p className="text-center text-sm md:text-base text-gray-600 dark:text-gray-400">Cart is empty</p>
                            <p className="text-xs md:text-sm text-center mt-1 text-gray-500 dark:text-gray-500">Click on products to add</p>
                        </div>
                    ) : (
                        <div className="divide-y dark:divide-gray-700">
                            {cart.items.map((item) => (
                                <div key={item.id} className="p-2 md:p-3">
                                    <div className="flex gap-2 mb-2">
                                        {item.imageUrl && (
                                            <img
                                                src={item.imageUrl}
                                                alt={item.productName}
                                                className="w-10 md:w-12 h-10 md:h-12 object-cover rounded"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-xs md:text-sm dark:text-white truncate">{item.productName}</h4>
                                            <p className="text-xs dark:text-gray-400">{item.variantDetails}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 md:h-8 md:w-8 flex-shrink-0"
                                            onClick={() => cart.removeItem(item.variantId)}
                                        >
                                            <Trash2 className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between gap-1 md:gap-2">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 w-7 md:h-8 md:w-8 p-0 text-xs"
                                                onClick={() => cart.updateQuantity(item.variantId, Math.max(1, item.quantity - 1))}
                                            >
                                                -
                                            </Button>
                                            <span className="text-xs md:text-sm font-medium dark:text-white w-8 text-center">{item.quantity}</span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 w-7 md:h-8 md:w-8 p-0 text-xs"
                                                onClick={() => cart.updateQuantity(item.variantId, item.quantity + 1)}
                                            >
                                                +
                                            </Button>
                                        </div>
                                        <span className="text-xs md:text-sm font-bold dark:text-white">
                                            {formatCurrency(item.totalPrice)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Totals & Checkout */}
                <div className="border-t dark:border-gray-700">
                    {/* Discount & Notes */}
                    <div className="p-2 md:p-3 space-y-2 border-b dark:border-gray-700">
                        <Input
                            type="number"
                            placeholder="Discount amount..."
                            value={cart.discount || ''}
                            onChange={(e) => cart.setDiscount(parseFloat(e.target.value) || 0)}
                            className="text-xs md:text-sm dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>

                    {/* Totals */}
                    <div className="p-2 md:p-4 space-y-1 md:space-y-2">
                        <div className="flex justify-between text-xs md:text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                            <span className="font-medium dark:text-white">{formatCurrency(cart.getSubtotal())}</span>
                        </div>

                        {cart.discount > 0 && (
                            <div className="flex justify-between text-xs md:text-sm text-green-600">
                                <span>Discount</span>
                                <span>-{formatCurrency(cart.discount)}</span>
                            </div>
                        )}

                        <div className="flex justify-between text-xs md:text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Tax ({(taxRate * 100).toFixed(0)}%)</span>
                            <span className="font-medium dark:text-white">{formatCurrency(cart.getTax(taxRate))}</span>
                        </div>

                        <Separator className="dark:bg-gray-700" />

                        <div className="flex justify-between text-base md:text-lg font-bold dark:text-white">
                            <span>Total</span>
                            <span>{formatCurrency(cart.getTotal(taxRate))}</span>
                        </div>
                    </div>

                    {/* Payment Buttons */}
                    <div className="p-2 md:p-3 space-y-1.5 md:space-y-2">
                        <Button
                            className="w-full text-xs md:text-sm py-2 md:py-3"
                            disabled={cart.items.length === 0 || isProcessing}
                            onClick={() => handleCheckout('CASH')}
                        >
                            <Banknote className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                            <span className="hidden sm:inline">Cash Payment</span>
                            <span className="sm:hidden">Cash</span>
                        </Button>

                        <div className="grid grid-cols-2 gap-1 md:gap-2">
                            <Button
                                variant="outline"
                                className="text-xs md:text-sm py-2 md:py-3"
                                disabled={cart.items.length === 0 || isProcessing}
                                onClick={() => handleCheckout('CARD')}
                            >
                                <CreditCard className="mr-1 h-3 w-3 md:h-4 md:w-4" />
                                <span className="hidden sm:inline">Card</span>
                                <span className="sm:hidden">Card</span>
                            </Button>

                            <Button
                                variant="outline"
                                className="text-xs md:text-sm py-2 md:py-3"
                                disabled={cart.items.length === 0 || isProcessing}
                                onClick={() => handleCheckout('MOBILE')}
                            >
                                <Smartphone className="mr-1 h-3 w-3 md:h-4 md:w-4" />
                                <span className="hidden sm:inline">Mobile</span>
                                <span className="sm:hidden">Mob</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Barcode Scanner Modal */}
            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={handleBarcodeSubmit}
                variantIndex={0}
            />
        </div>
    )
}