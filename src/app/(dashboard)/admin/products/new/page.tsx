'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, Trash2, Upload, X, Scan, Keyboard, Wand2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import Image from 'next/image'
import { createProduct } from '@/lib/actions/products'
import { safeWriteAction, isServerActionHashMismatch } from '@/lib/utils/server-action-handler'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'
import BarcodeScannerModal from '@/components/barcode-scanner-modal'

const PRESET_TYPES = ['EDP', 'EDT', 'EDC', 'Parfum']

function generateSku(brand: string, name: string, size: string) {
    const brandCode = brand.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'GEN'
    const nameCode = name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'PRD'
    const sizeCode = size.replace(/[^0-9]/g, '')
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase()
    return [brandCode, nameCode, sizeCode, randomPart].filter(Boolean).join('-')
}

function generateBarcode() {
    return `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`.slice(0, 13)
}

export default function NewProductPage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [activeScanIndex, setActiveScanIndex] = useState<number | null>(0)
    const [isScannerModalOpen, setIsScannerModalOpen] = useState(false)
    const [scannerActiveVariantIndex, setScannerActiveVariantIndex] = useState<number | null>(null)

    const [product, setProduct] = useState({
        brand: '',
        name: '',
        category: 'Women',
        description: '',
        topNotes: '',
        middleNotes: '',
        baseNotes: '',
    })

    const [images, setImages] = useState<File[]>([])
    const [imagePreviews, setImagePreviews] = useState<string[]>([])

    const [showCustomTypeInput, setShowCustomTypeInput] = useState<{ [key: number]: boolean }>({})

    const [variants, setVariants] = useState([
        { size: '', type: 'EDP', retailPrice: '', sku: '', barcode: '', isTester: false }
    ])

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

    const addVariant = () => {
        setVariants([...variants, { size: '', type: 'EDP', retailPrice: '', sku: '', barcode: '', isTester: false }])
        setActiveScanIndex(variants.length) // scanning follows the newest row automatically
    }

    const removeVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index))
        setActiveScanIndex((current) => {
            if (current === null) return null
            if (current === index) return Math.max(0, index - 1)
            return current > index ? current - 1 : current
        })
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        const newFiles = [...images, ...files]

        // Validate file types
        const validFiles = newFiles.filter(file => {
            if (!file.type.startsWith('image/')) {
                toast.error(`${file.name} is not a valid image`)
                return false
            }
            return true
        })

        setImages(validFiles)

        // Create previews
        const newPreviews: string[] = []
        validFiles.forEach(file => {
            const reader = new FileReader()
            reader.onload = (event) => {
                if (event.target?.result) {
                    newPreviews.push(event.target.result as string)
                    if (newPreviews.length === validFiles.length) {
                        setImagePreviews(newPreviews)
                    }
                }
            }
            reader.readAsDataURL(file)
        })
    }

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index))
        setImagePreviews(imagePreviews.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            // Validate variants
            if (variants.length === 0) {
                toast.error('Please add at least one variant')
                setIsSubmitting(false)
                return
            }

            const invalidVariants = variants.filter(v => !v.size || !v.type || !v.sku || !v.retailPrice)
            if (invalidVariants.length > 0) {
                toast.error('Please fill in all required variant fields (Size, Type, SKU, Retail Price)')
                setIsSubmitting(false)
                return
            }

            // Upload images if any
            let imageUrl = ''
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

            // Call createProduct server action with safe wrapper
            const result = await safeWriteAction(
                () => createProduct({
                    brand: product.brand,
                    name: product.name,
                    category: product.category,
                    description: product.description,
                    topNotes: product.topNotes,
                    middleNotes: product.middleNotes,
                    baseNotes: product.baseNotes,
                    imageUrl: imageUrl,
                    variants: variants.map(v => ({
                        size: v.size,
                        type: v.type,
                        sku: v.sku,
                        barcode: v.barcode,
                        retailPrice: parseFloat(v.retailPrice),
                        isTester: v.isTester,
                    })),
                }),
                'createProduct'
            )

            if (result.success) {
                toast.success('Product created successfully!')
                router.push('/admin/products')
            } else {
                toast.error(result.error || 'Failed to create product')
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create product'
            if (!isServerActionHashMismatch(error)) {
                toast.error(message)
            }
        } finally {
            setIsSubmitting(false)
        }
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
                    <h1 className="text-3xl font-bold dark:text-white">New Product</h1>
                    <p className="text-gray-500 dark:text-gray-400">Add a new product to your catalog</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Details */}
                <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 dark:text-white">Product Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Brand *</label>
                            <Input
                                required
                                value={product.brand}
                                onChange={(e) => setProduct({ ...product, brand: e.target.value })}
                                placeholder="e.g., Chanel"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Name *</label>
                            <Input
                                required
                                value={product.name}
                                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                                placeholder="e.g., No. 5"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Category *</label>
                            <select
                                required
                                value={product.category}
                                onChange={(e) => setProduct({ ...product, category: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="Women">Women</option>
                                <option value="Men">Men</option>
                                <option value="Unisex">Unisex</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Description</label>
                            <Input
                                value={product.description}
                                onChange={(e) => setProduct({ ...product, description: e.target.value })}
                                placeholder="Product description"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Top Notes</label>
                            <Input
                                value={product.topNotes}
                                onChange={(e) => setProduct({ ...product, topNotes: e.target.value })}
                                placeholder="e.g., Bergamot, Lemon"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Middle Notes</label>
                            <Input
                                value={product.middleNotes}
                                onChange={(e) => setProduct({ ...product, middleNotes: e.target.value })}
                                placeholder="e.g., Jasmine, Rose"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Base Notes</label>
                            <Input
                                value={product.baseNotes}
                                onChange={(e) => setProduct({ ...product, baseNotes: e.target.value })}
                                placeholder="e.g., Vanilla, Sandalwood"
                            />
                        </div>
                    </div>
                </Card>

                {/* Product Images */}
                <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 dark:text-white">Product Images</h2>
                    
                    <div className="mb-4 space-y-3">
                        <label className="block text-sm font-medium dark:text-gray-200">Upload or Capture Images</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Upload Files */}
                            <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer transition">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center justify-center">
                                    <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Upload Files</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click or drag images</p>
                                </div>
                            </div>

                            {/* Capture from Camera */}
                            <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer transition">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center justify-center">
                                    <svg className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Take Picture</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use device camera</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {imagePreviews.length > 0 && (
                        <div>
                            <p className="text-sm font-medium mb-3 dark:text-gray-200">Uploaded Images ({imagePreviews.length})</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="relative group">
                                        <div className="w-full h-32 relative rounded-lg overflow-hidden dark:border dark:border-gray-600">
                                            <Image
                                                src={preview}
                                                alt={`Preview ${index + 1}`}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                {/* Variants */}
                <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold dark:text-white">Variants</h2>
                        <Button type="button" variant="outline" onClick={addVariant}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Variant
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {variants.map((variant, index) => (
                            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-medium dark:text-gray-200">Variant {index + 1}</h3>
                                    {variants.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeVariant(index)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-gray-200">Size *</label>
                                        <Input
                                            required
                                            value={variant.size}
                                            onChange={(e) => {
                                                const newVariants = [...variants]
                                                newVariants[index].size = e.target.value
                                                setVariants(newVariants)
                                            }}
                                            placeholder="e.g., 50ml"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-gray-200">Type *</label>
                                        <div className="flex flex-wrap gap-2">
                                            {PRESET_TYPES.map((t) => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => {
                                                        const newVariants = [...variants]
                                                        newVariants[index].type = t
                                                        setVariants(newVariants)
                                                        setShowCustomTypeInput({ ...showCustomTypeInput, [index]: false })
                                                    }}
                                                    className={`px-3 py-2 rounded-md text-sm font-medium border transition ${
                                                        variant.type === t && !showCustomTypeInput[index]
                                                            ? 'bg-blue-600 border-blue-600 text-white'
                                                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-gray-400'
                                                    }`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => setShowCustomTypeInput({ ...showCustomTypeInput, [index]: true })}
                                                className={`px-3 py-2 rounded-md text-sm font-medium border transition ${
                                                    showCustomTypeInput[index]
                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-gray-400'
                                                }`}
                                            >
                                                Other
                                            </button>
                                        </div>
                                        {showCustomTypeInput[index] && (
                                            <Input
                                                autoFocus
                                                className="mt-2"
                                                placeholder="Enter type, e.g. Attar"
                                                value={variant.type}
                                                onChange={(e) => {
                                                    const newVariants = [...variants]
                                                    newVariants[index].type = e.target.value
                                                    setVariants(newVariants)
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-gray-200">SKU *</label>
                                        <div className="flex gap-2">
                                            <Input
                                                required
                                                value={variant.sku}
                                                onChange={(e) => {
                                                    const newVariants = [...variants]
                                                    newVariants[index].sku = e.target.value
                                                    setVariants(newVariants)
                                                }}
                                                placeholder="Auto-filled, or type your own"
                                                className={activeScanIndex === index ? 'ring-2 ring-blue-500' : ''}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const newVariants = [...variants]
                                                    newVariants[index].sku = generateSku(product.brand, product.name, variant.size)
                                                    setVariants(newVariants)
                                                }}
                                                title="Generate a SKU automatically"
                                            >
                                                <Wand2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={activeScanIndex === index ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => {
                                                    setActiveScanIndex(activeScanIndex === index ? null : index)
                                                    toast.info(activeScanIndex === index ? 'Scanning disabled' : 'Ready to scan SKU with a keyboard scanner')
                                                }}
                                                title={activeScanIndex === index ? 'Scanning is ON — scan now, click to turn off' : 'Turn on keyboard barcode-scanner input for this field'}
                                            >
                                                <Keyboard className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {activeScanIndex === index && (
                                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Scanning ON — scan the SKU now</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-gray-200">Barcode</label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={variant.barcode}
                                                onChange={(e) => {
                                                    const newVariants = [...variants]
                                                    newVariants[index].barcode = e.target.value
                                                    setVariants(newVariants)
                                                }}
                                                placeholder="Auto-filled, or scan one"
                                                className={activeScanIndex === index ? 'ring-2 ring-blue-500' : ''}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const newVariants = [...variants]
                                                    newVariants[index].barcode = generateBarcode()
                                                    setVariants(newVariants)
                                                }}
                                                title="Generate a barcode automatically"
                                            >
                                                <Wand2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="default"
                                                size="sm"
                                                onClick={() => {
                                                    setScannerActiveVariantIndex(index)
                                                    setIsScannerModalOpen(true)
                                                }}
                                                title="Scan a barcode with the camera"
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                <Scan className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-gray-200">Retail Price *</label>
                                        <Input
                                            required
                                            type="number"
                                            step="0.01"
                                            value={variant.retailPrice}
                                            onChange={(e) => {
                                                const newVariants = [...variants]
                                                newVariants[index].retailPrice = e.target.value
                                                setVariants(newVariants)
                                            }}
                                            placeholder="150.00"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={variant.isTester}
                                                onChange={(e) => {
                                                    const newVariants = [...variants]
                                                    newVariants[index].isTester = e.target.checked
                                                    setVariants(newVariants)
                                                }}
                                                className="rounded dark:accent-blue-600"
                                            />
                                            <span className="text-sm dark:text-gray-200">Tester</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                    <Link href="/admin/products">
                        <Button type="button" variant="outline">Cancel</Button>
                    </Link>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating...' : 'Create Product'}
                    </Button>
                </div>
            </form>

            {/* Barcode Scanner Modal */}
            <BarcodeScannerModal
                isOpen={isScannerModalOpen}
                onClose={() => setIsScannerModalOpen(false)}
                onScan={(barcode: string) => {
                    if (scannerActiveVariantIndex !== null) {
                        const newVariants = [...variants]
                        newVariants[scannerActiveVariantIndex].barcode = barcode
                        setVariants(newVariants)
                    }
                }}
                variantIndex={scannerActiveVariantIndex || 0}
            />
        </div>
    )
}
