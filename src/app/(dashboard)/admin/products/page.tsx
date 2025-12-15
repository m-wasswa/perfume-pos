'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Edit, Package, Loader2, Upload, Scan, Trash2 } from 'lucide-react'
import { getProducts, searchProducts, deleteProduct } from '@/lib/actions/products'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/formatters'

// Simple debounce implementation inside the component
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

export default function ProductsPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedSearch = useDebounce(searchQuery, 500)
    const [products, setProducts] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ productId: string; productName: string } | null>(null)
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 0,
        current: 1,
        limit: 10
    })

    const fetchProducts = async (page = 1) => {
        setIsLoading(true)
        try {
            const result = await getProducts(page)
            if (result.success && result.products) {
                setProducts(result.products)
                setPagination(result.pagination!)
            } else {
                toast.error('Failed to fetch products')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSearch = async (query: string) => {
        if (!query) {
            fetchProducts(1)
            return
        }

        setIsLoading(true)
        try {
            const result = await searchProducts(query)
            if (result.success && result.products) {
                setProducts(result.products)
                // Search doesn't return pagination, so we reset it or handle it differently
                setPagination({ total: result.products.length, pages: 1, current: 1, limit: 100 })
            }
        } catch (error) {
            toast.error('Search failed')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (debouncedSearch) {
            handleSearch(debouncedSearch)
        } else {
            fetchProducts(1)
        }
    }, [debouncedSearch])

    const handleDeleteClick = (productId: string, productName: string) => {
        setDeleteConfirmation({ productId, productName })
    }

    const confirmDelete = async () => {
        if (!deleteConfirmation) return

        const { productId } = deleteConfirmation
        setIsDeleting(productId)
        try {
            const result = await deleteProduct(productId)
            if (result.success) {
                toast.success('Product deleted successfully')
                // Remove from list
                setProducts(products.filter(p => p.id !== productId))
                setDeleteConfirmation(null)
            } else {
                toast.error(result.error || 'Failed to delete product')
                setDeleteConfirmation(null)
            }
        } catch (error) {
            toast.error('An error occurred while deleting the product')
            setDeleteConfirmation(null)
        } finally {
            setIsDeleting(null)
        }
    }

    const cancelDelete = () => {
        setDeleteConfirmation(null)
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold dark:text-white">Products</h1>
                    <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">Manage your product catalog</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full md:w-auto">
                    <Link href="/admin/products/barcode-scan" className="flex-1 sm:flex-none">
                        <Button variant="outline" size="lg" className="w-full md:w-auto dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                            <Scan className="mr-2 h-5 w-5 flex-shrink-0" />
                            <span className="hidden sm:inline">Scan Barcode</span>
                            <span className="sm:hidden">Scan</span>
                        </Button>
                    </Link>
                    <Link href="/admin/products/bulk-import" className="flex-1 sm:flex-none">
                        <Button variant="outline" size="lg" className="w-full md:w-auto dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                            <Upload className="mr-2 h-5 w-5 flex-shrink-0" />
                            <span className="hidden sm:inline">Bulk Import</span>
                            <span className="sm:hidden">Import</span>
                        </Button>
                    </Link>
                    <Link href="/admin/products/new" className="flex-1 sm:flex-none">
                        <Button size="lg" className="w-full md:w-auto">
                            <Plus className="mr-2 h-5 w-5 flex-shrink-0" />
                            <span className="hidden sm:inline">Add Product</span>
                            <span className="sm:hidden">Add</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Search */}
            <Card className="p-3 md:p-4 dark:bg-gray-800 dark:border-gray-700">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search products..."
                        className="pl-10 text-sm md:text-base dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </Card>

            {/* Products List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                ) : products.length === 0 ? (
                    <Card className="p-8 text-center dark:bg-gray-800 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">No products found</p>
                    </Card>
                ) : (
                    products.map((product) => (
                        <Card key={product.id} className="p-4 md:p-6 dark:bg-gray-800 dark:border-gray-700">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-0 mb-4">
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-lg md:text-xl font-semibold dark:text-white truncate">{product.brand} {product.name}</h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <Badge className="text-xs md:text-sm">{product.category}</Badge>
                                        <Badge variant="outline" className="text-xs md:text-sm dark:text-gray-300">{product.variants.length} variants</Badge>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                    <Link href={`/admin/products/${product.id}`} className="flex-1 sm:flex-none">
                                        <Button variant="outline" className="w-full md:w-auto dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                                            <Edit className="h-4 w-4 mr-2 flex-shrink-0" />
                                            Edit
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteClick(product.id, `${product.brand} ${product.name}`)}
                                        disabled={isDeleting === product.id}
                                        className="w-full sm:w-auto text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2 flex-shrink-0" />
                                        {isDeleting === product.id ? 'Deleting...' : 'Delete'}
                                    </Button>
                                </div>
                            </div>

                            {/* Variants */}
                            <div className="space-y-2">
                                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Variants:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                                    {product.variants.map((variant: any) => (
                                        <div
                                            key={variant.sku}
                                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg gap-2 sm:gap-0"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-sm md:text-base dark:text-gray-200 truncate">{variant.size} {variant.type}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {variant.sku}</p>
                                            </div>
                                            <div className="text-left sm:text-right">
                                                <p className="font-semibold text-sm md:text-base dark:text-white">{formatCurrency(Number(variant.retailPrice))}</p>
                                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                    <Package className="h-3 w-3 mr-1 flex-shrink-0" />
                                                    {variant.inventory?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0} in stock
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Pagination */}
            {!searchQuery && pagination.pages > 1 && (
                <div className="flex flex-col sm:flex-row sm:justify-center sm:gap-2 gap-3 mt-6">
                    <Button
                        variant="outline"
                        disabled={pagination.current === 1}
                        onClick={() => fetchProducts(pagination.current - 1)}
                        className="w-full sm:w-auto"
                    >
                        Previous
                    </Button>
                    <span className="flex items-center justify-center px-4 text-sm text-gray-600 dark:text-gray-400 order-first sm:order-none">
                        Page {pagination.current} of {pagination.pages}
                    </span>
                    <Button
                        variant="outline"
                        disabled={pagination.current === pagination.pages}
                        onClick={() => fetchProducts(pagination.current + 1)}
                        className="w-full sm:w-auto"
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-sm dark:bg-gray-800 dark:border-gray-700">
                        <div className="p-6 space-y-4">
                            <div>
                                <h2 className="text-lg md:text-xl font-semibold dark:text-white">Delete Product</h2>
                                <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-2">
                                    Are you sure you want to delete <span className="font-semibold">"{deleteConfirmation.productName}"</span>?
                                </p>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-2">
                                    This action cannot be undone. The product can only be deleted if it has no inventory attached.
                                </p>
                            </div>
                            <div className="flex gap-3 justify-end pt-4">
                                <Button
                                    variant="outline"
                                    onClick={cancelDelete}
                                    disabled={isDeleting !== null}
                                    className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={confirmDelete}
                                    disabled={isDeleting !== null}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
