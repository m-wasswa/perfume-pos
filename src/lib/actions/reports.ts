'use server'

import { prisma } from '@/lib/db/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-config'

export async function getReportsData(startDate?: Date, endDate?: Date) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return { success: false, error: 'Unauthorized' }
        }

        console.log('getReportsData called with:', { startDate, endDate })

        // Adjust dates to include full days
        let adjustedEndDate = endDate
        if (endDate) {
            adjustedEndDate = new Date(endDate)
            adjustedEndDate.setHours(23, 59, 59, 999)
        }

        const where = {
            createdAt: {
                ...(startDate && { gte: startDate }),
                ...(adjustedEndDate && { lte: adjustedEndDate }),
            },
        }

        console.log('Query filter:', where)

        // Get orders with items
        const orders = await prisma.order.findMany({
            where,
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        console.log('Orders found:', orders.length)

        // Calculate metrics
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)
        const totalCOGS = orders.reduce((sum, order) => {
            const orderCOGS = order.items.reduce((itemSum, item) => itemSum + (item.unitCost * item.quantity), 0)
            return sum + orderCOGS
        }, 0)
        const grossProfit = totalRevenue - totalCOGS

        // Get expenses
        const expenses = await prisma.expense.findMany({
            where,
        })

        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
        const netProfit = grossProfit - totalExpenses

        // Top products
        const productSales = new Map<string, { name: string; quantity: number; revenue: number }>()

        orders.forEach(order => {
            order.items.forEach(item => {
                const key = item.variant.productId
                const productName = `${item.variant.product.brand} ${item.variant.product.name}`

                if (productSales.has(key)) {
                    const existing = productSales.get(key)!
                    existing.quantity += item.quantity
                    existing.revenue += item.totalPrice
                } else {
                    productSales.set(key, {
                        name: productName,
                        quantity: item.quantity,
                        revenue: item.totalPrice,
                    })
                }
            })
        })

        const topProducts = Array.from(productSales.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)

        return {
            success: true,
            data: {
                revenue: totalRevenue,
                cogs: totalCOGS,
                grossProfit,
                expenses: totalExpenses,
                netProfit,
                profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
                orderCount: orders.length,
                topProducts,
                expensesByCategory: expenses.reduce((acc, exp) => {
                    acc[exp.category] = (acc[exp.category] || 0) + exp.amount
                    return acc
                }, {} as Record<string, number>),
            },
        }
    } catch (error) {
        console.error('Get reports error:', error)
        return { success: false, error: 'Failed to fetch reports data' }
    }
}

export async function getSalesData(period: 'day' | 'week' | 'month' | 'year' = 'month', startDate?: Date, endDate?: Date) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return { success: false, error: 'Unauthorized' }
        }

        let dateFilter: any = {}

        // If custom dates provided, use them; otherwise use period-based defaults
        if (startDate && endDate) {
            // Adjust end date to include full day
            const adjustedEndDate = new Date(endDate)
            adjustedEndDate.setHours(23, 59, 59, 999)

            dateFilter = {
                createdAt: {
                    gte: startDate,
                    lte: adjustedEndDate,
                },
            }
        } else {
            const now = new Date()
            let periodStartDate = new Date()

            switch (period) {
                case 'day':
                    periodStartDate.setDate(now.getDate() - 30)
                    break
                case 'week':
                    periodStartDate.setDate(now.getDate() - 12 * 7)
                    break
                case 'month':
                    periodStartDate.setMonth(now.getMonth() - 12)
                    break
                case 'year':
                    periodStartDate.setFullYear(now.getFullYear() - 5)
                    break
            }

            dateFilter = {
                createdAt: {
                    gte: periodStartDate,
                },
            }
        }

        const orders = await prisma.order.findMany({
            where: dateFilter,
            include: {
                items: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        })

        // Group by period
        const salesByPeriod = new Map<string, { revenue: number; profit: number; cogs: number }>()

        orders.forEach(order => {
            const date = new Date(order.createdAt)
            let key: string

            switch (period) {
                case 'day':
                    key = date.toISOString().split('T')[0]
                    break
                case 'week':
                    const weekStart = new Date(date)
                    weekStart.setDate(date.getDate() - date.getDay())
                    key = weekStart.toISOString().split('T')[0]
                    break
                case 'month':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                    break
                case 'year':
                    key = String(date.getFullYear())
                    break
                default:
                    key = date.toISOString().split('T')[0]
            }

            const cogs = order.items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0)
            const revenue = order.total
            const profit = revenue - cogs

            if (salesByPeriod.has(key)) {
                const existing = salesByPeriod.get(key)!
                existing.revenue += revenue
                existing.profit += profit
                existing.cogs += cogs
            } else {
                salesByPeriod.set(key, { revenue, profit, cogs })
            }
        })

        const salesData = Array.from(salesByPeriod.entries())
            .map(([date, data]) => ({
                date,
                ...data,
            }))
            .sort((a, b) => a.date.localeCompare(b.date))

        return {
            success: true,
            data: salesData,
        }
    } catch (error) {
        console.error('Get sales data error:', error)
        return { success: false, error: 'Failed to fetch sales data' }
    }
}
