'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Package, AlertTriangle, Loader2, Upload, RefreshCw, Edit, Trash2 } from 'lucide-react'
import { getInventory, deleteInventoryBatch, updateInventoryBatch } from '@/lib/actions/inventory'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/formatters'

export default function InventoryContent() {
    const searchParams = useSearchParams()
    const [searchQuery, setSearchQuery] = useState('')
    const [inventory, setInventory] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [editingBatch, setEditingBatch] = useState<{ id: string; quantity: number; wholesalePrice: number; vendor: string } | null>(null)
    const [isDeletingBatch, setIsDeletingBatch] = useState<string | null>(null)
    const [isSavingBatch, setIsSavingBatch] = useState(false)
    const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null)

    const fetchInventory = async () => {
        setIsLoading(true)
        try {
            const result = await getInventory()
            if (result.success && result.inventory) {
                setInventory(result.inventory)
            } else {
                toast.error('Failed to fetch inventory')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await fetchInventory()
        setIsRefreshing(false)
        toast.success('Inventory updated!')
    }

    useEffect(() => {
        fetchInventory()
    }, [searchParams.get('refresh')])

    const handleDeleteBatch = async (batchId: string) => {
        setDeleteConfirmation(batchId)
    }

    const confirmDeleteBatch = async () => {
        if (!deleteConfirmation) return

        setIsDeletingBatch(deleteConfirmation)
        try {
            const result = await deleteInventoryBatch(deleteConfirmation)
            if (result.success) {
                toast.success('Batch deleted successfully')
                await fetchInventory()
                setDeleteConfirmation(null)
            } else {
                toast.error(result.error || 'Failed to delete batch')
                setDeleteConfirmation(null)
            }
        } catch (error) {
            toast.error('An error occurred')
            setDeleteConfirmation(null)
        } finally {
            setIsDeletingBatch(null)
        }
    }

    const filteredInventory = inventory.filter(item =>
        item.variant?.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.variant?.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.vendor?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold dark:text-white">Inventory Management</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Manage stock batches and received inventory</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Link href="/admin/inventory/receive">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Receive Stock
                        </Button>
                    </Link>
                    <Link href="/admin/inventory/barcode-scan">
                        <Button variant="outline" className="gap-2">
                            <Search className="h-4 w-4" />
                            Barcode Scan
                        </Button>
                    </Link>
                    <Link href="/admin/inventory/bulk-import">
                        <Button variant="outline" className="gap-2">
                            <Upload className="h-4 w-4" />
                            Bulk Import
                        </Button>
                    </Link>
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Search */}
            <Card className="p-4 dark:bg-gray-800 dark:border-gray-700">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by SKU, product name, or vendor..."
                        className="pl-10 dark:bg-gray-700 dark:border-gray-600"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </Card>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            ) : filteredInventory.length === 0 ? (
                <Card className="p-8 text-center dark:bg-gray-800 dark:border-gray-700">
                    <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">No inventory batches found</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredInventory.map((item) => (
                        <Card key={item.id} className="p-4 md:p-6 dark:bg-gray-800 dark:border-gray-700">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                                {/* Product Info - Takes 2 cols on desktop */}
                                <div className="md:col-span-2">
                                    <div className="flex items-center gap-2 mb-3">
                                        <h3 className="font-semibold text-lg dark:text-white">
                                            {item.variant?.product?.brand} {item.variant?.product?.name}
                                        </h3>
                                        {item.quantity <= 5 && (
                                            <Badge className="bg-red-500 hover:bg-red-600 text-white">
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                Low Stock
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                        <p>SKU: <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{item.variant?.sku}</span></p>
                                        <p>Variant: <span className="text-gray-700 dark:text-gray-300">{item.variant?.size} - {item.variant?.type}</span></p>
                                        <p>Vendor: <span className="text-gray-700 dark:text-gray-300">{item.vendor}</span></p>
                                    </div>
                                </div>

                                {/* Pricing - Col on desktop */}
                                <div className="md:text-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Wholesale Price</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(parseFloat(item.wholesalePrice) || 0)}
                                    </p>
                                </div>

                                {/* Stock & Actions - Col on desktop */}
                                <div className="flex flex-col gap-2">
                                    {editingBatch && editingBatch.id === item.id ? (
                                        <div className="space-y-2 w-full md:w-48">
                                            <Input
                                                type="number"
                                                placeholder="Quantity"
                                                value={editingBatch.quantity}
                                                onChange={(e) => setEditingBatch({
                                                    ...editingBatch,
                                                    quantity: parseInt(e.target.value) || 0
                                                })}
                                                className="dark:bg-gray-700 dark:border-gray-600"
                                            />
                                            <Input
                                                type="number"
                                                placeholder="Wholesale Price"
                                                value={editingBatch.wholesalePrice}
                                                onChange={(e) => setEditingBatch({
                                                    ...editingBatch,
                                                    wholesalePrice: parseFloat(e.target.value) || 0
                                                })}
                                                className="dark:bg-gray-700 dark:border-gray-600"
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={async () => {
                                                        setIsSavingBatch(true)
                                                        try {
                                                            const result = await updateInventoryBatch(item.id, {
                                                                quantity: editingBatch.quantity,
                                                                wholesalePrice: editingBatch.wholesalePrice,
                                                                vendor: editingBatch.vendor
                                                            })
                                                            if (result.success) {
                                                                toast.success('Batch updated successfully')
                                                                await fetchInventory()
                                                                setEditingBatch(null)
                                                            } else {
                                                                toast.error(result.error || 'Failed to update')
                                                            }
                                                        } catch (error) {
                                                            toast.error('An error occurred')
                                                        } finally {
                                                            setIsSavingBatch(false)
                                                        }
                                                    }}
                                                    disabled={isSavingBatch}
                                                    className="flex-1"
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setEditingBatch(null)}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{item.quantity}</p>
                                                <p className="text-xs text-gray-500">Units in stock</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setEditingBatch({
                                                        id: item.id,
                                                        quantity: item.quantity,
                                                        wholesalePrice: item.wholesalePrice,
                                                        vendor: item.vendor
                                                    })}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDeleteBatch(item.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6 dark:bg-gray-800">
                        <h2 className="text-lg font-bold mb-4 dark:text-white">Delete Batch</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete this inventory batch? This action cannot be undone.
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteConfirmation(null)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmDeleteBatch}
                                disabled={isDeletingBatch !== null}
                                className="flex-1"
                            >
                                {isDeletingBatch ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Delete
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
