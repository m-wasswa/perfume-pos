'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    ComposedChart,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts'
import { Download, TrendingUp, DollarSign, Package, Users, Loader2, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { getReportsData, getSalesData } from '@/lib/actions/reports'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/formatters'

export default function ReportsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [metrics, setMetrics] = useState({
        revenue: 0,
        profit: 0,
        orders: 0,
        customers: 0,
        cogs: 0,
        expenses: 0,
        profitMargin: 0
    })
    const [salesData, setSalesData] = useState<any[]>([])
    const [topProducts, setTopProducts] = useState<any[]>([])
    const [expenseData, setExpenseData] = useState<any[]>([])
    const [revenueGrowth, setRevenueGrowth] = useState(0)
    const [isExporting, setIsExporting] = useState(false)

    // Set default dates to last 30 days
    useEffect(() => {
        const today = new Date()
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
        setEndDate(today.toISOString().split('T')[0])
    }, [])

    useEffect(() => {
        const fetchData = async () => {
            if (!startDate || !endDate) return
            
            setIsLoading(true)
            try {
                const startDateObj = new Date(startDate)
                const endDateObj = new Date(endDate)
                
                console.log('Fetching reports with dates:', {
                    startDate,
                    endDate,
                    startDateObj,
                    endDateObj,
                })

                const [reportsResult, salesResult] = await Promise.all([
                    getReportsData(startDateObj, endDateObj),
                    getSalesData('month', startDateObj, endDateObj)
                ])

                if (reportsResult.success && reportsResult.data) {
                    setMetrics({
                        revenue: reportsResult.data.revenue,
                        profit: reportsResult.data.netProfit,
                        orders: reportsResult.data.orderCount,
                        customers: 0,
                        cogs: reportsResult.data.cogs,
                        expenses: reportsResult.data.expenses,
                        profitMargin: reportsResult.data.profitMargin
                    })
                    setTopProducts(reportsResult.data.topProducts.map((p: any) => ({
                        name: p.name,
                        sold: p.quantity,
                        revenue: p.revenue
                    })))
                    
                    // Process expense data for pie chart
                    const expensesByCategory = Object.entries(reportsResult.data.expensesByCategory || {}).map(([category, amount]: [string, any]) => ({
                        name: category,
                        value: amount,
                    }))
                    setExpenseData(expensesByCategory)
                    
                    // Calculate revenue growth
                    if (salesResult.success && salesResult.data && salesResult.data.length > 1) {
                        const firstMonth = salesResult.data[0]?.revenue || 0
                        const lastMonth = salesResult.data[salesResult.data.length - 1]?.revenue || 0
                        const growth = firstMonth ? ((lastMonth - firstMonth) / firstMonth) * 100 : 0
                        setRevenueGrowth(growth)
                    }
                }

                if (salesResult.success && salesResult.data) {
                    setSalesData(salesResult.data)
                }
            } catch (error) {
                toast.error('Failed to load reports data')
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [startDate, endDate])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    const handleExportCSV = () => {
        setIsExporting(true)
        try {
            // Prepare CSV data
            const csvContent = []
            csvContent.push('FINANCIAL REPORT')
            csvContent.push(`Date Range: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`)
            csvContent.push(`Generated: ${new Date().toLocaleString()}`)
            csvContent.push('')

            // Key Metrics
            csvContent.push('KEY METRICS')
            csvContent.push(`Total Revenue,${metrics.revenue}`)
            csvContent.push(`Cost of Goods Sold,${metrics.cogs}`)
            csvContent.push(`Gross Profit,${metrics.revenue - metrics.cogs}`)
            csvContent.push(`Total Expenses,${metrics.expenses}`)
            csvContent.push(`Net Profit,${metrics.profit}`)
            csvContent.push(`Profit Margin (%),${metrics.profitMargin.toFixed(2)}`)
            csvContent.push(`Total Orders,${metrics.orders}`)
            csvContent.push('')

            // Sales Data
            if (salesData.length > 0) {
                csvContent.push('SALES DATA')
                csvContent.push('Date,Revenue,Profit,COGS')
                salesData.forEach(row => {
                    csvContent.push(`${row.date},${row.revenue},${row.profit},${row.cogs}`)
                })
                csvContent.push('')
            }

            // Top Products
            if (topProducts.length > 0) {
                csvContent.push('TOP PRODUCTS')
                csvContent.push('Product Name,Units Sold,Revenue')
                topProducts.forEach(product => {
                    csvContent.push(`"${product.name}",${product.sold},${product.revenue}`)
                })
                csvContent.push('')
            }

            // Expenses
            if (expenseData.length > 0) {
                csvContent.push('EXPENSES BY CATEGORY')
                csvContent.push('Category,Amount')
                expenseData.forEach(expense => {
                    csvContent.push(`"${expense.name}",${expense.value}`)
                })
            }

            // Create blob and download
            const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', `financial_report_${startDate}_to_${endDate}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            toast.success('Report exported successfully!')
        } catch (error) {
            console.error('Export error:', error)
            toast.error('Failed to export report')
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold dark:text-white">Financial Reports</h1>
                    <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">Analyze performance and profitability</p>
                </div>
                <Button
                    onClick={handleExportCSV}
                    disabled={isExporting}
                    className="gap-2"
                >
                    {isExporting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Exporting...
                        </>
                    ) : (
                        <>
                            <Download className="h-4 w-4" />
                            Export Report
                        </>
                    )}
                </Button>
            </div>

            {/* Date Range Picker */}
            <Card className="p-4 md:p-6 dark:bg-gray-800 dark:border-gray-700">
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2 dark:text-gray-200">Start Date</label>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-gray-400" />
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2 dark:text-gray-200">End Date</label>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-gray-400" />
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={() => {
                                const today = new Date()
                                const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                                setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
                                setEndDate(today.toISOString().split('T')[0])
                                toast.success('Date range reset to last 30 days')
                            }}
                            variant="outline"
                            className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 w-full md:w-auto"
                        >
                            Last 30 Days
                        </Button>
                    </div>
                    {startDate && endDate && (
                        <div className="pt-2 border-t dark:border-gray-600">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-semibold dark:text-gray-200">Displaying data from:</span> {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Revenue</p>
                            <h3 className="text-3xl font-bold text-blue-900 dark:text-blue-300">{formatCurrency(metrics.revenue)}</h3>
                            <div className="flex items-center gap-1 mt-2">
                                {revenueGrowth >= 0 ? (
                                    <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                                ) : (
                                    <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                                )}
                                <p className={`text-sm font-semibold ${revenueGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {Math.abs(revenueGrowth).toFixed(1)}% {revenueGrowth >= 0 ? 'increase' : 'decrease'}
                                </p>
                            </div>
                        </div>
                        <div className="h-14 w-14 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <DollarSign className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 dark:border-gray-700 bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Net Profit</p>
                            <h3 className="text-3xl font-bold text-green-900 dark:text-green-300">{formatCurrency(metrics.profit)}</h3>
                            <p className="text-sm font-semibold text-green-700 dark:text-green-400 mt-2">{metrics.profitMargin.toFixed(1)}% margin</p>
                        </div>
                        <div className="h-14 w-14 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 dark:border-gray-700 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Orders</p>
                            <h3 className="text-3xl font-bold text-purple-900 dark:text-purple-300">{metrics.orders.toLocaleString()}</h3>
                            <p className="text-sm text-purple-700 dark:text-purple-400 mt-2">Completed transactions</p>
                        </div>
                        <div className="h-14 w-14 bg-purple-500 dark:bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Package className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 dark:border-gray-700 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Expenses</p>
                            <h3 className="text-3xl font-bold text-orange-900 dark:text-orange-300">{formatCurrency(metrics.expenses)}</h3>
                            <p className="text-sm text-orange-700 dark:text-orange-400 mt-2">{((metrics.expenses / metrics.revenue) * 100).toFixed(1)}% of revenue</p>
                        </div>
                        <div className="h-14 w-14 bg-orange-500 dark:bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="revenue" className="space-y-4">
                <TabsList className="dark:bg-gray-800 dark:text-gray-400 bg-gray-100 w-full justify-start overflow-x-auto">
                    <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
                    <TabsTrigger value="products">Top Products</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="comparison">Revenue vs Profit</TabsTrigger>
                    <TabsTrigger value="pl">P&L Statement</TabsTrigger>
                </TabsList>

                <TabsContent value="revenue" className="space-y-4">
                    <Card className="p-6 dark:bg-gray-800 dark:border-gray-700 bg-white">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Revenue & Profit Trend (Area Chart)</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <AreaChart data={salesData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="date" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', borderRadius: '8px' }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                    name="Revenue"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="profit"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorProfit)"
                                    name="Profit"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                </TabsContent>

                <TabsContent value="products" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card className="lg:col-span-2 p-6 dark:bg-gray-800 dark:border-gray-700 bg-white">
                            <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Top Selling Products</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={topProducts}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', borderRadius: '8px' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="sold" fill="#8b5cf6" name="Units Sold" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="revenue" fill="#3b82f6" name="Revenue ($)" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card className="p-6 dark:bg-gray-800 dark:border-gray-700 bg-white">
                            <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Product Distribution</h3>
                            {topProducts.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={topProducts.slice(0, 5)}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }: any) => `${name?.split(' ')[0] || 'Product'}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="revenue"
                                        >
                                            {topProducts.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', borderRadius: '8px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-center text-gray-500 dark:text-gray-400">No product data available</p>
                            )}
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="expenses" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card className="p-6 dark:bg-gray-800 dark:border-gray-700 bg-white">
                            <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Expenses by Category</h3>
                            {expenseData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={350}>
                                    <PieChart>
                                        <Pie
                                            data={expenseData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {expenseData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#10b981'][index % 6]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', borderRadius: '8px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-center text-gray-500 dark:text-gray-400">No expense data available</p>
                            )}
                        </Card>

                        <Card className="p-6 dark:bg-gray-800 dark:border-gray-700 bg-white">
                            <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Expense Breakdown</h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {expenseData.length > 0 ? (
                                    expenseData.map((expense, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: ['#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#10b981'][index % 6] }}
                                                />
                                                <span className="text-sm font-medium dark:text-gray-200 text-gray-700">{expense.name}</span>
                                            </div>
                                            <span className="text-sm font-semibold dark:text-white text-gray-900">{formatCurrency(expense.value)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500 dark:text-gray-400">No data</p>
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t dark:border-gray-600">
                                <div className="flex justify-between font-bold">
                                    <span className="dark:text-gray-200">Total Expenses</span>
                                    <span className="dark:text-white">{formatCurrency(metrics.expenses)}</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="comparison" className="space-y-4">
                    <Card className="p-6 dark:bg-gray-800 dark:border-gray-700 bg-white">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white text-gray-900">Revenue vs Profit Comparison</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <ComposedChart data={salesData}>
                                <defs>
                                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="date" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', borderRadius: '8px' }}
                                />
                                <Legend />
                                <Bar dataKey="revenue" fill="url(#colorBar)" name="Revenue" radius={[8, 8, 0, 0]} />
                                <Line
                                    type="monotone"
                                    dataKey="profit"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    name="Profit"
                                    dot={{ fill: '#10b981', r: 4 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </Card>
                </TabsContent>

                <TabsContent value="pl" className="space-y-4">
                    <Card className="p-8 dark:bg-gray-800 dark:border-gray-700 bg-white">
                        <h3 className="text-2xl font-bold mb-8 dark:text-white text-gray-900 text-center">Profit & Loss Statement</h3>
                        <div className="space-y-2 max-w-2xl mx-auto">
                            {/* Revenue Section */}
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-700 dark:to-gray-800 p-4 rounded-lg">
                                <div className="flex justify-between py-2">
                                    <span className="font-semibold dark:text-blue-300 text-blue-900">Total Revenue</span>
                                    <span className="font-bold dark:text-blue-200 text-blue-900 text-lg">{formatCurrency(metrics.revenue)}</span>
                                </div>
                            </div>

                            {/* COGS Section */}
                            <div className="bg-red-50 dark:bg-gray-700 p-4 rounded-lg">
                                <div className="flex justify-between py-2">
                                    <span className="text-gray-700 dark:text-gray-300">Cost of Goods Sold (COGS)</span>
                                    <span className="font-semibold text-red-600 dark:text-red-400">-{formatCurrency(metrics.cogs)}</span>
                                </div>
                            </div>

                            {/* Gross Profit */}
                            <div className="bg-green-50 dark:bg-gray-700 p-4 rounded-lg border-2 border-green-200 dark:border-green-700">
                                <div className="flex justify-between py-2">
                                    <span className="font-bold text-green-900 dark:text-green-300">Gross Profit</span>
                                    <span className="font-bold text-green-900 dark:text-green-300 text-lg">{formatCurrency(metrics.revenue - metrics.cogs)}</span>
                                </div>
                            </div>

                            {/* Operating Expenses */}
                            <div className="my-6 pt-4 border-t-2 dark:border-gray-600">
                                <h4 className="font-semibold dark:text-gray-200 text-gray-900 mb-3">Operating Expenses</h4>
                                <div className="bg-orange-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <div className="flex justify-between py-2">
                                        <span className="text-gray-700 dark:text-gray-300">Total Expenses</span>
                                        <span className="font-semibold text-orange-600 dark:text-orange-400">-{formatCurrency(metrics.expenses)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Net Profit */}
                            <div className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 p-6 rounded-lg border-2 border-emerald-300 dark:border-emerald-700">
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-lg font-bold text-emerald-900 dark:text-emerald-200">Net Profit</span>
                                    <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(metrics.profit)}</span>
                                </div>
                            </div>

                            {/* Profit Margin */}
                            <div className="flex justify-between py-3 bg-gray-100 dark:bg-gray-700 px-4 rounded-lg mt-4">
                                <span className="font-semibold dark:text-gray-200 text-gray-900">Profit Margin</span>
                                <span className="font-bold dark:text-white text-gray-900 text-lg">{metrics.profitMargin.toFixed(1)}%</span>
                            </div>

                            {/* COGS Percentage */}
                            <div className="flex justify-between py-2 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <span className="text-sm text-gray-600 dark:text-gray-400">COGS as % of Revenue</span>
                                <span className="text-sm font-semibold dark:text-gray-200 text-gray-900">{metrics.revenue > 0 ? ((metrics.cogs / metrics.revenue) * 100).toFixed(1) : 0}%</span>
                            </div>

                            {/* Expense Percentage */}
                            <div className="flex justify-between py-2 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Operating Expenses as % of Revenue</span>
                                <span className="text-sm font-semibold dark:text-gray-200 text-gray-900">{metrics.revenue > 0 ? ((metrics.expenses / metrics.revenue) * 100).toFixed(1) : 0}%</span>
                            </div>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
