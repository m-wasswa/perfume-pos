'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Upload, Download, Scan, Plus, Trash2, AlertCircle, CheckCircle, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { formatCurrency } from '@/lib/utils/formatters'
import BarcodeScannerModal from '@/components/barcode-scanner-modal'

interface StockImportRow {
    sku: string
    quantity: string
    wholesalePrice: string
    vendor: string
    manufactureDate?: string
}

interface ProductDetail {
    id: string
    sku: string
    brand: string
    name: string
    size: string
    type: string
}

export default function BulkStockImportPage() {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const barcodeInputRef = useRef<HTMLInputElement>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [importData, setImportData] = useState<StockImportRow[]>([])
    const [errors, setErrors] = useState<string[]>([])
    const [validRows, setValidRows] = useState<StockImportRow[]>([])
    const [productDetails, setProductDetails] = useState<{ [key: string]: ProductDetail }>({})

    // Barcode scanner state
    const [barcodeMode, setBarcodeMode] = useState(false)
    const [scanItems, setScanItems] = useState<StockImportRow[]>([])
    const [currentBarcode, setCurrentBarcode] = useState('')
    const [currentVendor, setCurrentVendor] = useState('')
    const [currentPrice, setCurrentPrice] = useState('')
    const [isScannerOpen, setIsScannerOpen] = useState(false)

    const validateRow = (row: StockImportRow, index: number): string | null => {
        // SKU is always required
        if (!row.sku?.trim()) return `Row ${index + 1}: SKU is required`
        
        // Quantity - required and must be positive number
        if (!row.quantity || isNaN(Number(row.quantity)) || Number(row.quantity) <= 0) 
            return `Row ${index + 1}: Quantity must be a positive number`
        
        // Wholesale Price - required and must be positive number
        if (!row.wholesalePrice || isNaN(Number(row.wholesalePrice)) || Number(row.wholesalePrice) <= 0)
            return `Row ${index + 1}: Wholesale Price must be a positive number`
        
        // Vendor - required
        if (!row.vendor?.trim()) return `Row ${index + 1}: Vendor is required`
        
        return null
    }

    const fetchProductDetails = async (skus: string[]) => {
        const uniqueSkus = [...new Set(skus)]
        const details: { [key: string]: ProductDetail } = {}
        let foundCount = 0
        let notFoundSkus: string[] = []

        for (const sku of uniqueSkus) {
            try {
                const response = await fetch(`/api/products/by-sku/${encodeURIComponent(sku)}`)
                if (response.ok) {
                    const data = await response.json()
                    if (data.success && data.variant && data.product) {
                        details[sku] = {
                            id: data.variant.id,
                            sku: data.variant.sku,
                            brand: data.product.brand,
                            name: data.product.name,
                            size: data.variant.size,
                            type: data.variant.type,
                        }
                        foundCount++
                    } else {
                        notFoundSkus.push(sku)
                    }
                } else {
                    notFoundSkus.push(sku)
                }
            } catch (error) {
                console.error(`Failed to fetch details for ${sku}:`, error)
                notFoundSkus.push(sku)
            }
        }

        setProductDetails(details)
        
        if (notFoundSkus.length > 0) {
            console.warn(`Products not found for SKUs: ${notFoundSkus.join(', ')}`)
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const isCSV = file.name.endsWith('.csv')
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

        if (!isCSV && !isExcel) {
            toast.error('Please upload a CSV or Excel file (.csv, .xlsx, .xls)')
            return
        }

        const processData = (rows: StockImportRow[]) => {
            const validatedRows: StockImportRow[] = []
            const validationErrors: string[] = []

            console.log('Processing rows:', rows.length)
            
            rows.forEach((row, index) => {
                // Convert to string and trim values
                row.sku = String(row.sku || '').trim()
                row.quantity = String(row.quantity || '').trim()
                row.wholesalePrice = String(row.wholesalePrice || '').trim()
                row.vendor = String(row.vendor || '').trim()
                
                console.log(`Row ${index}:`, { sku: row.sku, quantity: row.quantity, wholesalePrice: row.wholesalePrice, vendor: row.vendor })
                
                // Check if row is empty (skip empty rows)
                if (!row.sku || (!row.quantity && !row.wholesalePrice && !row.vendor)) {
                    console.log(`Row ${index} skipped: empty row`)
                    return
                }

                const error = validateRow(row, index)
                if (error) {
                    console.log(`Row ${index} error:`, error)
                    validationErrors.push(error)
                } else {
                    validatedRows.push(row)
                }
            })

            console.log('Valid rows:', validatedRows.length, 'Errors:', validationErrors.length)
            
            setImportData(rows)
            setValidRows(validatedRows)
            setErrors(validationErrors)

            // Fetch product details for all SKUs
            const skus = validatedRows.map(row => row.sku)
            if (skus.length > 0) {
                fetchProductDetails(skus)
                toast.success(`Loaded ${validatedRows.length} valid rows from ${isCSV ? 'CSV' : 'Excel'} file`)
            } else {
                toast.error('No valid rows found in file')
            }
        }

        if (isExcel) {
            // Handle Excel file
            const reader = new FileReader()
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer)
                    const workbook = XLSX.read(data, { type: 'array' })
                    const firstSheet = workbook.SheetNames[0]
                    const worksheet = workbook.Sheets[firstSheet]
                    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]
                    
                    console.log('Excel raw data:', jsonData[0]) // Debug: see actual column names
                    
                    // Convert Excel column names to match our expected format
                    // Support both the template format (productName, brand, etc.) and flexible names
                    const rows = jsonData.map((row: any) => ({
                        sku: String(row.sku || row.SKU || '').trim(),
                        quantity: String(row.quantity || row.Quantity || row.qty || row.Qty || '').trim(),
                        wholesalePrice: String(row.wholesalePrice || row.WholesalePrice || row.price || row.Price || '').trim(),
                        vendor: String(row.vendor || row.Vendor || row.supplier || row.Supplier || '').trim(),
                        manufactureDate: String(row.manufactureDate || row.ManufactureDate || row.mfgDate || row.MfgDate || row.mfg || row.Mfg || '').trim(),
                    })) as StockImportRow[]
                    
                    console.log('Converted rows:', rows[0]) // Debug: see converted data
                    processData(rows)
                } catch (error) {
                    console.error('Error parsing Excel file:', error)
                    toast.error('Failed to parse Excel file')
                }
            }
            reader.readAsArrayBuffer(file)
        } else {
            // Handle CSV file
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const rows = results.data as StockImportRow[]
                    processData(rows)
                },
                error: (error) => {
                    console.error('CSV parse error:', error)
                    toast.error('Failed to parse CSV file')
                }
            })
        }
    }

    const handleBarcodeScanned = async (barcode: string) => {
        setIsLoading(true)
        try {
            const response = await fetch(`/api/products/by-barcode/${encodeURIComponent(barcode)}`)
            
            if (!response.ok) {
                toast.error('Product not found for this barcode')
                setIsLoading(false)
                return
            }

            const data = await response.json()

            if (data.success && data.variant && data.product) {
                // Auto-fill form with product details
                setCurrentBarcode(barcode)
                setCurrentPrice(data.variant.wholesalePrice?.toString() || '')
                // Focus on vendor field for user to enter
                setTimeout(() => {
                    // Will be used when vendor field is ready
                }, 100)
                toast.success(`Found: ${data.product.brand} ${data.product.name}`)
            } else {
                toast.error('Product not found')
            }
        } catch (error) {
            console.error('Failed to fetch product:', error)
            toast.error('Failed to lookup product')
        } finally {
            setIsLoading(false)
        }
    }

    const handleBarcodeSubmit = async (sku: string) => {
        if (!sku.trim()) return

        if (!currentVendor.trim()) {
            toast.error('Please enter vendor name')
            return
        }

        if (!currentPrice || isNaN(Number(currentPrice))) {
            toast.error('Please enter valid price')
            return
        }

        setIsLoading(true)

        try {
            // Fetch product details
            const response = await fetch(`/api/products/by-sku/${encodeURIComponent(sku)}`)
            
            if (!response.ok) {
                toast.error('Product not found. Check SKU.')
                setIsLoading(false)
                return
            }

            const data = await response.json()

            if (data.success && data.variant && data.product) {
                const newItem: StockImportRow = {
                    sku,
                    quantity: '1',
                    wholesalePrice: currentPrice,
                    vendor: currentVendor,
                    manufactureDate: '',
                }

                setScanItems([...scanItems, newItem])
                setProductDetails({
                    ...productDetails,
                    [sku]: {
                        id: data.variant.id,
                        sku: data.variant.sku,
                        brand: data.product.brand,
                        name: data.product.name,
                        size: data.variant.size,
                        type: data.variant.type,
                    }
                })

                toast.success(`Added ${data.product.brand} ${data.product.name}`)
                setCurrentBarcode('')
                
                // Focus back on barcode input
                setTimeout(() => {
                    if (barcodeInputRef.current) {
                        barcodeInputRef.current.focus()
                    }
                }, 100)
            } else {
                toast.error('Product not found')
            }
        } catch (error) {
            toast.error('Failed to fetch product')
        } finally {
            setIsLoading(false)
        }
    }

    const removeScanItem = (index: number) => {
        setScanItems(scanItems.filter((_, i) => i !== index))
    }

    const updateScanItem = (index: number, field: keyof StockImportRow, value: string) => {
        setScanItems(scanItems.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ))
    }

    const handleImport = async (dataToImport: StockImportRow[]) => {
        if (dataToImport.length === 0) {
            toast.error('No valid rows to import')
            return
        }

        setIsLoading(true)

        try {
            // Convert to InventoryBatch format
            const batchItems = dataToImport
                .map(row => ({
                    variantId: productDetails[row.sku]?.id,
                    quantity: parseInt(row.quantity),
                    wholesalePrice: parseFloat(row.wholesalePrice),
                    vendor: row.vendor,
                    manufactureDate: row.manufactureDate || null,
                }))
                .filter(item => item.variantId) // Only include items with valid variantId

            if (batchItems.length === 0) {
                toast.error('❌ No valid products found. Use "Download Template" to see correct SKU values.')
                setIsLoading(false)
                return
            }

            if (batchItems.length < dataToImport.length) {
                const missingCount = dataToImport.length - batchItems.length
                toast.warning(`${missingCount} item(s) skipped - product not found`)
            }

            const response = await fetch('/api/admin/receive-stock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ items: batchItems }),
            })

            const result = await response.json()

            if (result.success) {
                toast.success(`Successfully imported ${result.imported} stock items!`)
                setImportData([])
                setValidRows([])
                setErrors([])
                setScanItems([])
                setProductDetails({})
                setCurrentBarcode('')
                setCurrentPrice('')
                setCurrentVendor('')
                if (fileInputRef.current) fileInputRef.current.value = ''
                setTimeout(() => router.push('/admin/inventory?refresh=' + Date.now()), 1500)
            } else {
                toast.error(result.error || 'Failed to import stock')
            }
        } catch (error) {
            toast.error('Failed to import stock')
        } finally {
            setIsLoading(false)
        }
    }

    const downloadTemplate = async (format: 'csv' | 'excel' = 'csv') => {
        setIsLoading(true)
        try {
            // Fetch all variants with product details
            const response = await fetch('/api/admin/all-variants')
            const data = await response.json()

            if (!data.success || !data.variants) {
                toast.error('Failed to load products')
                setIsLoading(false)
                return
            }

            const headers = ['brand', 'productName', 'category', 'size', 'type', 'sku', 'quantity', 'wholesalePrice', 'vendor', 'manufactureDate']
            
            const rows = data.variants.map((variant: any) => ({
                brand: variant.product.brand,
                productName: variant.product.name,
                category: variant.product.category,
                size: variant.size,
                type: variant.type,
                sku: variant.sku,
                quantity: '',
                wholesalePrice: '',
                vendor: '',
                manufactureDate: ''
            }))

            if (format === 'excel') {
                // Generate Excel file
                const worksheet = XLSX.utils.json_to_sheet(rows)
                
                // Set column widths
                const columnWidths = [15, 20, 15, 10, 12, 15, 10, 15, 15, 15]
                worksheet['!cols'] = columnWidths.map(width => ({ wch: width }))
                
                // Create workbook and add worksheet
                const workbook = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Import')
                
                // Generate Excel file
                XLSX.writeFile(workbook, 'stock-import-template-all-products.xlsx')
                toast.success('Excel template downloaded with all products!')
            } else {
                // Generate CSV file
                const csv = [
                    headers.join(','),
                    ...rows.map((row: any) =>
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
                a.download = 'stock-import-template-all-products.csv'
                a.click()
                window.URL.revokeObjectURL(url)

                toast.success('CSV template downloaded with all products!')
            }
        } catch (error) {
            console.error('Download error:', error)
            toast.error('Failed to download template')
        } finally {
            setIsLoading(false)
        }
    }

    const activeTab = barcodeMode ? 'barcode' : 'csv'
    const itemsToDisplay = barcodeMode ? scanItems : validRows

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
                    <h1 className="text-3xl font-bold dark:text-white">Bulk Stock Import</h1>
                    <p className="text-gray-500 dark:text-gray-400">Import inventory using CSV, Excel, or barcode scanner</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tab Toggle */}
                    <div className="flex gap-2">
                        <Button
                            variant={activeTab === 'csv' ? 'default' : 'outline'}
                            onClick={() => setBarcodeMode(false)}
                            className={activeTab === 'csv' ? '' : 'dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            File Import
                        </Button>
                        <Button
                            variant={activeTab === 'barcode' ? 'default' : 'outline'}
                            onClick={() => setBarcodeMode(true)}
                            className={activeTab === 'barcode' ? '' : 'dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'}
                        >
                            <Scan className="h-4 w-4 mr-2" />
                            Barcode Scan
                        </Button>
                    </div>

                    {/* CSV/Excel Import */}
                    {activeTab === 'csv' && (
                        <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                            <h2 className="text-xl font-semibold mb-4 dark:text-white">Upload File</h2>
                            
                            <div className="space-y-4">
                                <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer transition">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center justify-center">
                                        <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-2" />
                                        <p className="text-gray-600 dark:text-gray-300 font-medium">Drag and drop your CSV or Excel file</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or click to select (.csv, .xlsx, .xls)</p>
                                    </div>
                                </div>

                                {validRows.length > 0 && (
                                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <span className="text-sm font-medium dark:text-blue-300">
                                            {validRows.length} valid rows found
                                        </span>
                                        <Button
                                            onClick={() => handleImport(validRows)}
                                            disabled={isLoading}
                                            size="sm"
                                        >
                                            {isLoading ? 'Importing...' : 'Import Now'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Barcode Scanner */}
                    {activeTab === 'barcode' && (
                        <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                            <h2 className="text-xl font-semibold mb-4 dark:text-white">Scan Products</h2>
                            
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium mb-2 dark:text-gray-200">Barcode / SKU</label>
                                        <Input
                                            ref={barcodeInputRef}
                                            placeholder="Scan or type SKU..."
                                            value={currentBarcode}
                                            onChange={(e) => setCurrentBarcode(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleBarcodeSubmit(currentBarcode)
                                                }
                                            }}
                                            disabled={isLoading}
                                            autoFocus
                                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <Button
                                            onClick={() => setIsScannerOpen(true)}
                                            variant="outline"
                                            size="icon"
                                            title="Open camera scanner"
                                            className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                            <Scan className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 dark:text-gray-200">Quantity</label>
                                        <Input
                                            type="number"
                                            min="1"
                                            defaultValue="1"
                                            placeholder="1"
                                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 dark:text-gray-200">Wholesale Price</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={currentPrice}
                                            onChange={(e) => setCurrentPrice(e.target.value)}
                                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 dark:text-gray-200">Vendor</label>
                                    <Input
                                        placeholder="Supplier name"
                                        value={currentVendor}
                                        onChange={(e) => setCurrentVendor(e.target.value)}
                                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>

                                <Button
                                    onClick={() => handleBarcodeSubmit(currentBarcode)}
                                    disabled={isLoading || !currentBarcode.trim()}
                                    className="w-full"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Item
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Items List */}
                    {itemsToDisplay.length > 0 && (
                        <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                            <h2 className="text-lg font-semibold mb-4 dark:text-white">Items ({itemsToDisplay.length})</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b dark:border-gray-600">
                                        <tr>
                                            <th className="text-left py-2 px-3 font-medium dark:text-gray-300">Product</th>
                                            <th className="text-left py-2 px-3 font-medium dark:text-gray-300">SKU</th>
                                            <th className="text-left py-2 px-3 font-medium dark:text-gray-300">Qty</th>
                                            <th className="text-left py-2 px-3 font-medium dark:text-gray-300">Price</th>
                                            <th className="text-left py-2 px-3 font-medium dark:text-gray-300">Vendor</th>
                                            <th className="text-center py-2 px-3 font-medium dark:text-gray-300">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-gray-600">
                                        {itemsToDisplay.map((row, index) => {
                                            const details = productDetails[row.sku]
                                            return (
                                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="py-3 px-3 dark:text-gray-300">
                                                        <div>
                                                            <p className="font-medium">{details?.brand} {details?.name}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{details?.size} {details?.type}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 dark:text-gray-300">{row.sku}</td>
                                                    <td className="py-3 px-3">
                                                        {barcodeMode ? (
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                value={row.quantity}
                                                                onChange={(e) => updateScanItem(index, 'quantity', e.target.value)}
                                                                className="w-20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                            />
                                                        ) : (
                                                            row.quantity
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 dark:text-gray-300">{formatCurrency(parseFloat(row.wholesalePrice))}</td>
                                                    <td className="py-3 px-3 dark:text-gray-300">{row.vendor}</td>
                                                    <td className="py-3 px-3 text-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => barcodeMode ? removeScanItem(index) : null}
                                                            className="text-red-600 dark:text-red-400"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {barcodeMode && (
                                <div className="mt-4 flex gap-3">
                                    <Link href="/admin/inventory" className="flex-1">
                                        <Button variant="outline" className="w-full dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                                            Cancel
                                        </Button>
                                    </Link>
                                    <Button
                                        onClick={() => handleImport(scanItems)}
                                        disabled={isLoading}
                                        className="flex-1"
                                    >
                                        {isLoading ? 'Importing...' : 'Import Stock'}
                                    </Button>
                                </div>
                            )}
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Template */}
                    <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">Get Started</h3>
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                className="w-full dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                onClick={() => downloadTemplate('csv')}
                                disabled={isLoading}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download CSV Template
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                onClick={() => downloadTemplate('excel')}
                                disabled={isLoading}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download Excel Template
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                            Download a template and fill in your stock details
                        </p>
                    </Card>

                    {/* Requirements */}
                    <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">Requirements</h3>
                        <ul className="space-y-2 text-sm dark:text-gray-300">
                            <li className="flex items-start">
                                <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                                <span><strong>SKU</strong> - Product identifier</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                                <span><strong>Quantity</strong> - Units received</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                                <span><strong>Price</strong> - Wholesale cost</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-600 dark:text-blue-400 mr-2">✓</span>
                                <span><strong>Vendor</strong> - Supplier name</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-600 dark:text-blue-400 mr-2">○</span>
                                <span><strong>Date</strong> - Manufacture date</span>
                            </li>
                        </ul>
                    </Card>

                    {/* Errors */}
                    {errors.length > 0 && (
                        <Card className="p-6 dark:bg-red-900/20 dark:border-red-700 border border-red-200">
                            <div className="flex items-start space-x-2 mb-3">
                                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                <h3 className="font-semibold text-red-900 dark:text-red-300">Errors</h3>
                            </div>
                            <ul className="space-y-1 text-xs text-red-800 dark:text-red-300">
                                {errors.slice(0, 5).map((error, index) => (
                                    <li key={index} className="flex items-start">
                                        <span className="mr-2">•</span>
                                        <span>{error}</span>
                                    </li>
                                ))}
                                {errors.length > 5 && (
                                    <li className="text-red-600 dark:text-red-400">... and {errors.length - 5} more</li>
                                )}
                            </ul>
                        </Card>
                    )}
                </div>
            </div>

            {/* Barcode Scanner Modal */}
            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={(barcode) => {
                    setCurrentBarcode(barcode)
                    handleBarcodeScanned(barcode)
                    setIsScannerOpen(false)
                }}
                variantIndex={0}
            />
        </div>
    )
}
