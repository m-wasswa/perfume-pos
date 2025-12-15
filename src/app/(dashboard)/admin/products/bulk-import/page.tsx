'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import Papa from 'papaparse'

interface ImportRow {
    brand: string
    name: string
    category: string
    description?: string
    topNotes?: string
    middleNotes?: string
    baseNotes?: string
    size: string
    type: string
    sku: string
    retailPrice: string
    wholesalePrice: string
    isTester?: string
}

export default function BulkImportPage() {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [importData, setImportData] = useState<ImportRow[]>([])
    const [errors, setErrors] = useState<string[]>([])
    const [validRows, setValidRows] = useState<ImportRow[]>([])

    const validateRow = (row: ImportRow, index: number): string | null => {
        if (!row.brand?.trim()) return `Row ${index + 1}: Brand is required`
        if (!row.name?.trim()) return `Row ${index + 1}: Name is required`
        if (!row.category?.trim()) return `Row ${index + 1}: Category is required`
        if (!row.size?.trim()) return `Row ${index + 1}: Size is required`
        if (!row.type?.trim()) return `Row ${index + 1}: Type is required`
        if (!row.sku?.trim()) return `Row ${index + 1}: SKU is required`
        if (!row.retailPrice || isNaN(Number(row.retailPrice))) return `Row ${index + 1}: Retail Price must be a number`
        if (!row.wholesalePrice || isNaN(Number(row.wholesalePrice))) return `Row ${index + 1}: Wholesale Price must be a number`
        return null
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.name.endsWith('.csv')) {
            toast.error('Please upload a CSV file')
            return
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data as ImportRow[]
                const validatedRows: ImportRow[] = []
                const validationErrors: string[] = []

                rows.forEach((row, index) => {
                    const error = validateRow(row, index)
                    if (error) {
                        validationErrors.push(error)
                    } else {
                        validatedRows.push(row)
                    }
                })

                setImportData(rows)
                setValidRows(validatedRows)
                setErrors(validationErrors)

                if (validationErrors.length > 0) {
                    toast.error(`Found ${validationErrors.length} validation errors`)
                } else {
                    toast.success(`Successfully parsed ${validatedRows.length} products`)
                }
            },
            error: (error) => {
                toast.error(`Failed to parse CSV: ${error.message}`)
            }
        })
    }

    const handleImport = async () => {
        if (validRows.length === 0) {
            toast.error('No valid rows to import')
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/admin/bulk-import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ products: validRows }),
            })

            const result = await response.json()

            if (result.success) {
                toast.success(`Successfully imported ${result.imported} products`)
                setImportData([])
                setValidRows([])
                setErrors([])
                if (fileInputRef.current) fileInputRef.current.value = ''
                setTimeout(() => router.push('/admin/products'), 1500)
            } else {
                toast.error(result.error || 'Failed to import products')
            }
        } catch (error) {
            toast.error('Failed to import products')
        } finally {
            setIsLoading(false)
        }
    }

    const downloadTemplate = () => {
        const headers = [
            'brand',
            'name',
            'category',
            'description',
            'topNotes',
            'middleNotes',
            'baseNotes',
            'size',
            'type',
            'sku',
            'retailPrice',
            'wholesalePrice',
            'isTester'
        ]
        
        const sampleData = [
            {
                brand: 'Chanel',
                name: 'No. 5',
                category: 'Women',
                description: 'Classic French perfume',
                topNotes: 'Bergamot, Lemon',
                middleNotes: 'Jasmine, Rose',
                baseNotes: 'Vanilla, Sandalwood',
                size: '50ml',
                type: 'EDP',
                sku: 'CHANEL-NO5-50ML',
                retailPrice: '150.00',
                wholesalePrice: '75.00',
                isTester: 'false'
            },
            {
                brand: 'Dior',
                name: 'Sauvage',
                category: 'Men',
                description: 'Fresh spicy fragrance',
                topNotes: 'Ambroxan',
                middleNotes: 'Pepper, Ambroxan',
                baseNotes: 'Cedar, Ambroxan',
                size: '100ml',
                type: 'EDT',
                sku: 'DIOR-SAUVAGE-100ML',
                retailPrice: '120.00',
                wholesalePrice: '60.00',
                isTester: 'false'
            }
        ]

        const csv = [
            headers.join(','),
            ...sampleData.map(row => 
                headers.map(header => {
                    const value = row[header as keyof typeof row] || ''
                    return `"${value}"`
                }).join(',')
            )
        ].join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'product-import-template.csv'
        a.click()
        window.URL.revokeObjectURL(url)
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
                    <h1 className="text-3xl font-bold dark:text-white">Bulk Import Products</h1>
                    <p className="text-gray-500 dark:text-gray-400">Import multiple products and variants using CSV</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Upload Card */}
                    <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                        <h2 className="text-xl font-semibold mb-4 dark:text-white">Upload CSV File</h2>
                        
                        <div className="space-y-4">
                            <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer transition">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center justify-center">
                                    <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-2" />
                                    <p className="text-gray-600 dark:text-gray-300 font-medium">Drag and drop your CSV file</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or click to select</p>
                                </div>
                            </div>

                            {importData.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <span className="text-sm font-medium dark:text-blue-300">
                                            {validRows.length} valid rows found
                                        </span>
                                        <Button
                                            onClick={handleImport}
                                            disabled={isLoading}
                                            size="sm"
                                        >
                                            {isLoading ? 'Importing...' : 'Import Now'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Data Preview */}
                    {validRows.length > 0 && (
                        <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                            <h2 className="text-lg font-semibold mb-4 dark:text-white">Preview ({validRows.length} rows)</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b dark:border-gray-600">
                                        <tr>
                                            <th className="text-left py-2 px-3 font-medium dark:text-gray-300">Brand</th>
                                            <th className="text-left py-2 px-3 font-medium dark:text-gray-300">Name</th>
                                            <th className="text-left py-2 px-3 font-medium dark:text-gray-300">Category</th>
                                            <th className="text-left py-2 px-3 font-medium dark:text-gray-300">Size</th>
                                            <th className="text-left py-2 px-3 font-medium dark:text-gray-300">Type</th>
                                            <th className="text-left py-2 px-3 font-medium dark:text-gray-300">SKU</th>
                                            <th className="text-left py-2 px-3 font-medium dark:text-gray-300">Retail</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-gray-600">
                                        {validRows.slice(0, 5).map((row, index) => (
                                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="py-2 px-3 dark:text-gray-300">{row.brand}</td>
                                                <td className="py-2 px-3 dark:text-gray-300">{row.name}</td>
                                                <td className="py-2 px-3 dark:text-gray-300">{row.category}</td>
                                                <td className="py-2 px-3 dark:text-gray-300">{row.size}</td>
                                                <td className="py-2 px-3 dark:text-gray-300">{row.type}</td>
                                                <td className="py-2 px-3 dark:text-gray-300">{row.sku}</td>
                                                <td className="py-2 px-3 dark:text-gray-300">${row.retailPrice}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {validRows.length > 5 && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                        ... and {validRows.length - 5} more rows
                                    </p>
                                )}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Template */}
                    <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">Get Started</h3>
                        <Button
                            variant="outline"
                            className="w-full dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            onClick={downloadTemplate}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download Template
                        </Button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                            Download a CSV template to see the required format
                        </p>
                    </Card>

                    {/* Info */}
                    <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">Requirements</h3>
                        <ul className="space-y-2 text-sm dark:text-gray-300">
                            <li className="flex items-start">
                                <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                                <span><strong>Brand</strong> - Required</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                                <span><strong>Name</strong> - Required</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                                <span><strong>Category</strong> - Women, Men, Unisex</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                                <span><strong>Size</strong> - e.g., 50ml, 100ml</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                                <span><strong>Type</strong> - EDP, EDT, EDC, Parfum</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                                <span><strong>SKU</strong> - Unique identifier</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                                <span><strong>Prices</strong> - Retail & Wholesale</span>
                            </li>
                        </ul>
                    </Card>

                    {/* Errors */}
                    {errors.length > 0 && (
                        <Card className="p-6 dark:bg-red-900/20 dark:border-red-700 border border-red-200">
                            <div className="flex items-start space-x-2 mb-3">
                                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                <h3 className="font-semibold text-red-900 dark:text-red-300">Validation Errors</h3>
                            </div>
                            <ul className="space-y-1 text-xs text-red-800 dark:text-red-300">
                                {errors.slice(0, 5).map((error, index) => (
                                    <li key={index} className="flex items-start">
                                        <span className="mr-2">•</span>
                                        <span>{error}</span>
                                    </li>
                                ))}
                                {errors.length > 5 && (
                                    <li className="text-red-600 dark:text-red-400">... and {errors.length - 5} more errors</li>
                                )}
                            </ul>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
