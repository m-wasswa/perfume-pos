'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, Trash2, Upload, X, Loader2, Scan } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { updateProduct } from '@/lib/actions/products'
import { safeWriteAction, isServerActionHashMismatch } from '@/lib/utils/server-action-handler'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'
import BarcodeScannerModal from '@/components/barcode-scanner-modal'

export default function EditProductPage() {
    const router = useRouter()
    const params = useParams()
    const productId = params.id as string

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [activeScanIndex, setActiveScanIndex] = useState<number | null>(null)
    const [isScannerModalOpen, setIsScannerModalOpen] = useState(false)
    const [scannerActiveVariantIndex, setScannerActiveVariantIndex] = useState<number | null>(null)

    const [product, setProduct] = useState({
        brand: '',
        name: '',
        category: 'Women',
        description: '',
        imageUrl: '',
        topNotes: '',
        middleNotes: '',
        baseNotes: '',
    })

    const [images, setImages] = useState<File[]>([])
    const [imagePreviews, setImagePreviews] = useState<string[]>([])
    const [currentImage, setCurrentImage] = useState('')

    const [variants, setVariants] = useState<any[]>([])
    const [customTypes, setCustomTypes] = useState<string[]>([])
    const [showCustomTypeInput, setShowCustomTypeInput] = useState<{ [key: number]: boolean }>({})

    // Load product data on mount
    useEffect(() => {
        const loadProduct = async () => {
            try {
                setIsLoading(true)
                const response = await fetch(`/api/products/${productId}`)
                if (response.ok) {
                    const data = await response.json()
                    if (data.success && data.product) {
                        const prod = data.product
                        setProduct({
                            brand: prod.brand,
                            name: prod.name,
                            category: prod.category,
                            description: prod.description || '',
                            imageUrl: prod.imageUrl || '',
                            topNotes: prod.olfactoryNotes?.[0] || '',
                            middleNotes: prod.olfactoryNotes?.[1] || '',
                            baseNotes: prod.olfactoryNotes?.[2] || '',
                        })
                        setCurrentImage(prod.imageUrl || '')
                        setVariants(prod.variants || [])
                    }
                } else {
                    toast.error('Failed to load product')
                    router.push('/admin/products')
                }
            } catch (error) {
                toast.error('An error occurred')
                router.push('/admin/products')
            } finally {
                setIsLoading(false)
            }
        }

        loadProduct()
    }, [productId, router])

    // Setup barcode scanner
    useBarcodeScanner((scannedValue: string, type: 'barcode' | 'sku') => {
        if (activeScanIndex !== null) {
            const newVariants = [...variants]
            if (type === 'barcode') {
                newVariants[activeScanIndex].barcode = scannedValue
            } else if (type === 'sku') {
                newVariants[activeScanIndex].sku = scannedValue
            }
            setVariants(newVariants)
            toast.success(`${type === 'barcode' ? 'Barcode' : 'SKU'} scanned: ${scannedValue}`)
        }
    })

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        // Validate file type
        if (!files[0].type.startsWith('image/')) {
            toast.error('Please upload a valid image')
            return
        }

        setImages([files[0]])

        // Create preview
        const reader = new FileReader()
        reader.onload = (event) => {
            if (event.target?.result) {
                setImagePreviews([event.target.result as string])
            }
        }
        reader.readAsDataURL(files[0])
    }

    const removeImage = () => {
        setImages([])
        setImagePreviews([])
    }

    const addVariant = () => {
        setVariants([...variants, { size: '', type: 'EDP', retailPrice: '', wholesalePrice: '', sku: '', barcode: '', isTester: false }])
    }

    const removeVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index))
    }

    const updateVariant = (index: number, field: string, value: any) => {
        const updated = [...variants]
        updated[index] = { ...updated[index], [field]: value }
        setVariants(updated)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            // Validate variants
            const invalidVariants = variants.filter(v => !v.size || !v.type || !v.sku || !v.retailPrice)
            if (invalidVariants.length > 0) {
                toast.error('Please fill in all required variant fields (Size, Type, SKU, Retail Price)')
                setIsSubmitting(false)
                return
            }

            // Upload new image if provided
            let imageUrl = currentImage
            if (images.length > 0) {
                const formData = new FormData()
                formData.append('file', images[0])

                const uploadResponse = await fetch('/api/admin/upload-image', {
                    method: 'POST',
                    body: formData
                })

                if (uploadResponse.ok) {
                    const uploadData = await uploadResponse.json()
                    imageUrl = uploadData.imageUrl
                } else {
                    toast.error('Failed to upload image')
                    setIsSubmitting(false)
                    return
                }
            }

            // Call updateProduct server action with safe wrapper
            const result = await safeWriteAction(
                () => updateProduct(productId, {
                    brand: product.brand,
                    name: product.name,
                    category: product.category,
                    description: product.description,
                    imageUrl: imageUrl,
                    topNotes: product.topNotes,
                    middleNotes: product.middleNotes,
                    baseNotes: product.baseNotes,
                    variants: variants.map(v => ({
                        id: v.id,
                        size: v.size,
                        type: v.type,
                        sku: v.sku,
                        barcode: v.barcode,
                        retailPrice: parseFloat(v.retailPrice),
                        wholesalePrice: parseFloat(v.wholesalePrice),
                        isTester: v.isTester,
                    })),
                }),
                'updateProduct'
            )

            if (result.success) {
                toast.success('Product updated successfully!')
                router.push('/admin/products')
            } else {
                toast.error(result.error || 'Failed to update product')
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update product'
            if (!isServerActionHashMismatch(error)) {
                toast.error(message)
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
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
                    <h1 className="text-3xl font-bold dark:text-white">Edit Product</h1>
                    <p className="text-gray-500 dark:text-gray-400">Update product details and variants</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Details */}
                <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 dark:text-white">Product Details</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Brand</label>
                            <Input
                                required
                                value={product.brand}
                                onChange={(e) => setProduct({ ...product, brand: e.target.value })}
                                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Product Name</label>
                            <Input
                                required
                                value={product.name}
                                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2 dark:text-gray-200">Description</label>
                        <textarea
                            value={product.description}
                            onChange={(e) => setProduct({ ...product, description: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Category *</label>
                            <select
                                required
                                value={product.category}
                                onChange={(e) => setProduct({ ...product, category: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option>Women</option>
                                <option>Men</option>
                                <option>Unisex</option>
                                <option>Kids</option>
                            </select>
                        </div>
                    </div>
                </Card>

                {/* Product Image */}
                <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 dark:text-white">Product Image</h2>
                    
                    <div className="space-y-4">
                        {currentImage && !imagePreviews.length && (
                            <div className="relative">
                                <img
                                    src={currentImage}
                                    alt="Product"
                                    className="w-32 h-32 object-cover rounded-lg"
                                />
                                <button
                                    type="button"
                                    onClick={() => setCurrentImage('')}
                                    className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        {imagePreviews.length > 0 && (
                            <div className="relative">
                                <img
                                    src={imagePreviews[0]}
                                    alt="Preview"
                                    className="w-32 h-32 object-cover rounded-lg"
                                />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        <label className="block cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-gray-400 dark:hover:border-gray-500">
                                <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload a new image</p>
                            </div>
                        </label>
                    </div>
                </Card>

                {/* Olfactory Notes */}
                <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 dark:text-white">Olfactory Notes</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Top Notes</label>
                            <Input
                                value={product.topNotes}
                                onChange={(e) => setProduct({ ...product, topNotes: e.target.value })}
                                placeholder="e.g., Bergamot, Lemon"
                                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Middle Notes</label>
                            <Input
                                value={product.middleNotes}
                                onChange={(e) => setProduct({ ...product, middleNotes: e.target.value })}
                                placeholder="e.g., Rose, Jasmine"
                                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Base Notes</label>
                            <Input
                                value={product.baseNotes}
                                onChange={(e) => setProduct({ ...product, baseNotes: e.target.value })}
                                placeholder="e.g., Sandalwood, Musk"
                                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    </div>
                </Card>

                {/* Variants */}
                <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold dark:text-white">Variants</h2>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addVariant}
                            className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Variant
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {variants.map((variant, index) => (
                            <div key={index} className="p-4 border rounded-lg dark:bg-gray-700/50 dark:border-gray-600">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-medium dark:text-white">Variant {index + 1}</h3>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeVariant(index)}
                                        className="text-red-600 dark:text-red-400"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium mb-1 dark:text-gray-300">Size *</label>
                                        <Input
                                            required
                                            value={variant.size}
                                            onChange={(e) => updateVariant(index, 'size', e.target.value)}
                                            placeholder="50ml"
                                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 dark:text-gray-300">Type *</label>
                                        {!showCustomTypeInput[index] ? (
                                            <div className="space-y-2">
                                                <select
                                                    required
                                                    value={variant.type}
                                                    onChange={(e) => {
                                                        if (e.target.value === 'custom') {
                                                            setShowCustomTypeInput({ ...showCustomTypeInput, [index]: true })
                                                        } else {
                                                            updateVariant(index, 'type', e.target.value)
                                                        }
                                                    }}
                                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                                >
                                                    <option value="">Select Type</option>
                                                    <option value="EDP">EDP - Eau de Parfum (15-20% fragrance)</option>
                                                    <option value="EDT">EDT - Eau de Toilette (5-15% fragrance)</option>
                                                    <option value="EDC">EDC - Eau de Cologne (2-5% fragrance)</option>
                                                    <option value="Parfum">Parfum - Pure Perfume (20-30% fragrance)</option>
                                                    {customTypes.map((ct) => (
                                                        <option key={ct} value={ct}>{ct}</option>
                                                    ))}
                                                    <option value="custom">+ Add Custom Type</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Input
                                                    autoFocus
                                                    placeholder="Enter custom type"
                                                    defaultValue={variant.type}
                                                    onBlur={(e) => {
                                                        if (e.target.value.trim()) {
                                                            updateVariant(index, 'type', e.target.value.trim())
                                                            if (!customTypes.includes(e.target.value.trim())) {
                                                                setCustomTypes([...customTypes, e.target.value.trim()])
                                                            }
                                                            setShowCustomTypeInput({ ...showCustomTypeInput, [index]: false })
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                                            updateVariant(index, 'type', e.currentTarget.value.trim())
                                                            if (!customTypes.includes(e.currentTarget.value.trim())) {
                                                                setCustomTypes([...customTypes, e.currentTarget.value.trim()])
                                                            }
                                                            setShowCustomTypeInput({ ...showCustomTypeInput, [index]: false })
                                                        }
                                                    }}
                                                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCustomTypeInput({ ...showCustomTypeInput, [index]: false })}
                                                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 dark:text-gray-300">SKU *</label>
                                        <Input
                                            required
                                            value={variant.sku}
                                            onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                                            placeholder="SKU-001"
                                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            disabled={variant.id}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 dark:text-gray-300">Barcode</label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={variant.barcode || ''}
                                                onChange={(e) => updateVariant(index, 'barcode', e.target.value)}
                                                placeholder="e.g., 3614270053124"
                                                className={`dark:bg-gray-700 dark:border-gray-600 dark:text-white ${activeScanIndex === index ? 'ring-2 ring-blue-500' : ''}`}
                                            />
                                            <Button
                                                type="button"
                                                variant="default"
                                                size="sm"
                                                onClick={() => {
                                                    setScannerActiveVariantIndex(index)
                                                    setIsScannerModalOpen(true)
                                                }}
                                                title="Open barcode scanner modal"
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                <Scan className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                                    <div>
                                        <label className="block text-xs font-medium mb-1 dark:text-gray-300">Retail Price (UGX) *</label>
                                        <Input
                                            required
                                            type="number"
                                            step="0.01"
                                            value={variant.retailPrice}
                                            onChange={(e) => updateVariant(index, 'retailPrice', e.target.value)}
                                            placeholder="0"
                                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="mt-3">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={variant.isTester}
                                            onChange={(e) => updateVariant(index, 'isTester', e.target.checked)}
                                            className="rounded"
                                        />
                                        <span className="text-sm dark:text-gray-300">Mark as tester</span>
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Submit Button */}
                <div className="flex gap-3">
                    <Link href="/admin/products" className="flex-1">
                        <Button variant="outline" className="w-full dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                            Cancel
                        </Button>
                    </Link>
                    <Button type="submit" disabled={isSubmitting} className="flex-1">
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>

            {/* Barcode Scanner Modal */}
            <BarcodeScannerModal
                isOpen={isScannerModalOpen}
                onClose={() => setIsScannerModalOpen(false)}
                onScan={(barcode) => {
                    if (scannerActiveVariantIndex !== null) {
                        const newVariants = [...variants]
                        newVariants[scannerActiveVariantIndex].barcode = barcode
                        setVariants(newVariants)
                        setIsScannerModalOpen(false)
                        toast.success(`Barcode scanned: ${barcode}`)
                    }
                }}
                variantIndex={scannerActiveVariantIndex ?? 0}
            />
        </div>
    )
}
