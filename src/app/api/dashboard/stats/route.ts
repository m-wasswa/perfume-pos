import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-config'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get today's date range (start and end of day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        // Calculate today's sales (sum of completed orders)
        const todayOrders = await prisma.order.findMany({
            where: {
                createdAt: {
                    gte: today,
                    lt: tomorrow
                },
                status: 'COMPLETED'
            }
        })

        const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0)
        const todayOrdersCount = todayOrders.length

        // Count total products
        const totalProducts = await prisma.product.count()

        // Count total customers
        const totalCustomers = await prisma.customer.count()

        // Get low stock items (where quantity < minStock)
        const lowStockInventory = await prisma.inventory.findMany({
            where: {
                quantity: {
                    lt: prisma.inventory.fields.minStock
                }
            },
            include: {
                variant: {
                    include: {
                        product: true
                    }
                }
            },
            take: 10
        })

        // Count low stock items
        const lowStockCount = await prisma.inventory.count({
            where: {
                quantity: {
                    lt: prisma.inventory.fields.minStock
                }
            }
        })

        // Get recent orders (last 5)
        const recentOrders = await prisma.order.findMany({
            take: 5,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                customer: true
            }
        })

        // Format low stock items
        const lowStockItems = lowStockInventory.map(item => ({
            name: `${item.variant.product.brand} ${item.variant.product.name} - ${item.variant.size}`,
            stock: item.quantity,
            minStock: item.minStock
        }))

        // Format recent orders
        const formattedRecentOrders = recentOrders.map(order => {
            const now = new Date()
            const orderDate = new Date(order.createdAt)
            const diffMs = now.getTime() - orderDate.getTime()
            const diffMins = Math.floor(diffMs / 60000)

            let timeAgo = ''
            if (diffMins < 60) {
                timeAgo = `${diffMins} mins ago`
            } else if (diffMins < 1440) {
                const hours = Math.floor(diffMins / 60)
                timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`
            } else {
                const days = Math.floor(diffMins / 1440)
                timeAgo = `${days} day${days > 1 ? 's' : ''} ago`
            }

            return {
                id: order.orderNumber,
                customer: order.customer?.name || 'Walk-in Customer',
                total: order.total,
                status: order.status,
                time: timeAgo
            }
        })

        // Get sales trend for last 7 days
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(today.getDate() - 7)

        const weekOrders = await prisma.order.findMany({
            where: {
                createdAt: {
                    gte: sevenDaysAgo
                },
                status: 'COMPLETED'
            },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            }
        })

        // Group sales by day
        const salesByDay = new Map<string, number>()
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today)
            date.setDate(today.getDate() - i)
            const dateKey = date.toISOString().split('T')[0]
            salesByDay.set(dateKey, 0)
        }

        weekOrders.forEach(order => {
            const dateKey = new Date(order.createdAt).toISOString().split('T')[0]
            if (salesByDay.has(dateKey)) {
                salesByDay.set(dateKey, salesByDay.get(dateKey)! + order.total)
            }
        })

        const salesTrend = Array.from(salesByDay.entries()).map(([date, sales]) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            sales
        }))

        // Get category distribution
        const categoryMap = new Map<string, number>()
        weekOrders.forEach(order => {
            order.items.forEach(item => {
                const category = item.variant.product.category
                categoryMap.set(category, (categoryMap.get(category) || 0) + item.totalPrice)
            })
        })

        const categoryDistribution = Array.from(categoryMap.entries()).map(([name, value]) => ({
            name,
            value
        }))

        return NextResponse.json({
            stats: {
                todaySales,
                todayOrders: todayOrdersCount,
                lowStock: lowStockCount,
                totalProducts,
                totalCustomers,
                pendingOrders: 0 // Can be implemented if needed
            },
            recentOrders: formattedRecentOrders,
            lowStockItems,
            salesTrend,
            categoryDistribution
        })
    } catch (error) {
        console.error('Dashboard stats error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch dashboard statistics' },
            { status: 500 }
        )
    }
}
