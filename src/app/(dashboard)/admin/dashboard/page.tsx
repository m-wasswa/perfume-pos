'use client'

import { Card } from '@/components/ui/card'
import {
    DollarSign,
    ShoppingCart,
    Package,
    TrendingUp,
    Users,
    AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/formatters'
import { useEffect, useState } from 'react'
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts'

interface DashboardStats {
    todaySales: number
    todayOrders: number
    lowStock: number
    totalProducts: number
    totalCustomers: number
    pendingOrders: number
}

interface RecentOrder {
    id: string
    customer: string
    total: number
    status: string
    time: string
}

interface LowStockItem {
    name: string
    stock: number
    minStock: number
}

interface SalesTrendItem {
    date: string
    sales: number
}

interface CategoryItem {
    name: string
    value: number
}

interface DashboardData {
    stats: DashboardStats
    recentOrders: RecentOrder[]
    lowStockItems: LowStockItem[]
    salesTrend: SalesTrendItem[]
    categoryDistribution: CategoryItem[]
}

export default function AdminDashboard() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                setLoading(true)
                const response = await fetch('/api/dashboard/stats')

                if (!response.ok) {
                    throw new Error('Failed to fetch dashboard data')
                }

                const dashboardData = await response.json()
                setData(dashboardData)
                setError(null)
            } catch (err) {
                console.error('Dashboard fetch error:', err)
                setError('Failed to load dashboard data')
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

    if (loading) {
        return (
            <div className="p-4 md:p-6 space-y-6">
                <div className="flex justify-center items-center h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
                        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading dashboard...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="p-4 md:p-6 space-y-6">
                <div className="flex justify-center items-center h-96">
                    <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-500">{error || 'Failed to load dashboard data'}</p>
                        <Button
                            onClick={() => window.location.reload()}
                            className="mt-4"
                        >
                            Retry
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    const { stats, recentOrders, lowStockItems, salesTrend, categoryDistribution } = data

    // Colors for pie chart
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold dark:text-white">Dashboard</h1>
                    <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">Welcome back! Here's what's happening today.</p>
                </div>
                <Link href="/terminal" className="w-full md:w-auto">
                    <Button size="lg" className="w-full md:w-auto">
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        <span className="hidden sm:inline">Open POS Terminal</span>
                        <span className="sm:hidden">POS Terminal</span>
                    </Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <Card className="p-4 md:p-6 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-1">Today's Sales</p>
                            <h3 className="text-xl md:text-2xl font-bold dark:text-white truncate">{formatCurrency(stats.todaySales)}</h3>
                            {stats.todaySales > 0 && (
                                <p className="text-sm text-green-600 dark:text-green-400 mt-1">Active sales today</p>
                            )}
                        </div>
                        <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                            <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4 md:p-6 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-1">Today's Orders</p>
                            <h3 className="text-xl md:text-2xl font-bold dark:text-white">{stats.todayOrders}</h3>
                            {stats.todayOrders > 0 && (
                                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{stats.todayOrders} order{stats.todayOrders !== 1 ? 's' : ''} today</p>
                            )}
                        </div>
                        <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                            <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4 md:p-6 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-1">Total Products</p>
                            <h3 className="text-xl md:text-2xl font-bold dark:text-white">{stats.totalProducts}</h3>
                            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">{stats.lowStock} low stock</p>
                        </div>
                        <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                            <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4 md:p-6 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-1">Total Customers</p>
                            <h3 className="text-xl md:text-2xl font-bold dark:text-white">{stats.totalCustomers}</h3>
                            {stats.totalCustomers > 0 && (
                                <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">Registered customers</p>
                            )}
                        </div>
                        <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Recent Orders */}
                <Card className="p-4 md:p-6 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2 sm:gap-0">
                        <h2 className="text-lg md:text-xl font-semibold dark:text-white">Recent Orders</h2>
                        <Link href="/admin/reports">
                            <Button variant="ghost" size="sm">View All</Button>
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {recentOrders.length > 0 ? (
                            recentOrders.map((order) => (
                                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div>
                                        <p className="font-medium dark:text-white">{order.id}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{order.customer}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold dark:text-white">{formatCurrency(order.total)}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{order.time}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                No orders yet
                            </div>
                        )}
                    </div>
                </Card>

                {/* Low Stock Alert */}
                <Card className="p-4 md:p-6 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2 sm:gap-0">
                        <h2 className="text-lg md:text-xl font-semibold dark:text-white flex items-center">
                            <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
                            Low Stock Items
                        </h2>
                        <Link href="/admin/inventory">
                            <Button variant="ghost" size="sm">View Inventory</Button>
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {lowStockItems.length > 0 ? (
                            lowStockItems.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <div>
                                        <p className="font-medium dark:text-white">{item.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Min stock: {item.minStock}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-orange-600 dark:text-orange-400">{item.stock} units</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Reorder needed</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                All items are well stocked
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Sales Trend Chart */}
                <Card className="p-4 md:p-6 dark:bg-gray-800 dark:border-gray-700">
                    <h2 className="text-lg md:text-xl font-semibold mb-4 dark:text-white">Sales Trend (Last 7 Days)</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                                dataKey="date"
                                stroke="#9ca3af"
                                style={{ fontSize: '12px' }}
                            />
                            <YAxis
                                stroke="#9ca3af"
                                style={{ fontSize: '12px' }}
                                tickFormatter={(value) => `${formatCurrency(value).split('.')[0]}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1f2937',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                                formatter={(value: number) => [formatCurrency(value), 'Sales']}
                            />
                            <Line
                                type="monotone"
                                dataKey="sales"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>

                {/* Category Distribution Chart */}
                <Card className="p-4 md:p-6 dark:bg-gray-800 dark:border-gray-700">
                    <h2 className="text-lg md:text-xl font-semibold mb-4 dark:text-white">Sales by Category</h2>
                    {categoryDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={categoryDistribution}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#9ca3af"
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis
                                    stroke="#9ca3af"
                                    style={{ fontSize: '12px' }}
                                    tickFormatter={(value) => `${formatCurrency(value).split('.')[0]}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#fff'
                                    }}
                                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                                />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                    {categoryDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                            No sales data available
                        </div>
                    )}
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className="p-4 md:p-6 dark:bg-gray-800 dark:border-gray-700">
                <h2 className="text-lg md:text-xl font-semibold mb-4 dark:text-white">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                    <Link href="/admin/products/new">
                        <Button variant="outline" className="w-full h-20 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                            <div className="text-center">
                                <Package className="h-6 w-6 mx-auto mb-2" />
                                <span className="text-sm">Add Product</span>
                            </div>
                        </Button>
                    </Link>
                    <Link href="/admin/inventory">
                        <Button variant="outline" className="w-full h-20 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                            <div className="text-center">
                                <TrendingUp className="h-6 w-6 mx-auto mb-2" />
                                <span className="text-sm">Receive Stock</span>
                            </div>
                        </Button>
                    </Link>
                    <Link href="/admin/reports">
                        <Button variant="outline" className="w-full h-20">
                            <div className="text-center">
                                <DollarSign className="h-6 w-6 mx-auto mb-2" />
                                <span className="text-sm">View Reports</span>
                            </div>
                        </Button>
                    </Link>
                    <Link href="/terminal">
                        <Button variant="outline" className="w-full h-20">
                            <div className="text-center">
                                <ShoppingCart className="h-6 w-6 mx-auto mb-2" />
                                <span className="text-sm">POS Terminal</span>
                            </div>
                        </Button>
                    </Link>
                </div>
            </Card>
        </div>
    )
}
