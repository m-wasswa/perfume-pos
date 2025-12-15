'use server'

import { prisma } from "@/lib/db/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth-config"
import { revalidatePath } from "next/cache"

interface CreateOrderData {
    items: Array<{
        variantId: string
        quantity: number
        unitPrice: number
    }>
    customerId?: string
    discount: number
    paymentMethod: 'CASH' | 'CARD' | 'MOBILE'
    notes?: string
}

export async function createOrder(data: CreateOrderData) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Try to find store assigned to user, fallback to first store
        let store = await prisma.store.findFirst({
            where: { users: { some: { id: session.user.id } } }
        })

        // If no store assigned to user, get the first available store
        if (!store) {
            store = await prisma.store.findFirst()
        }

        if (!store) {
            return { success: false, error: 'No store configured in the system' }
        }

        // Get the actual user from database (session.user.id might not match DB user.id)
        let cashier = await prisma.user.findUnique({
            where: { email: session.user.email! }
        })

        // Fallback to first user if email lookup fails
        if (!cashier) {
            cashier = await prisma.user.findFirst()
        }

        if (!cashier) {
            return { success: false, error: 'No cashier user found' }
        }

        // Calculate totals
        const subtotal = data.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
        const tax = (subtotal - data.discount) * store.taxRate
        const total = subtotal - data.discount + tax

        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

        // Create order with items using FIFO for batch allocation
        const order = await prisma.$transaction(async (tx) => {
            // Create the order
            const newOrder = await tx.order.create({
                data: {
                    orderNumber,
                    storeId: store.id,
                    cashierId: cashier.id,
                    customerId: data.customerId,
                    subtotal,
                    tax,
                    discount: data.discount,
                    total,
                    paymentMethod: data.paymentMethod,
                    paymentStatus: 'COMPLETED',
                    status: 'COMPLETED',
                    notes: data.notes,
                }
            })

            // Process each item
            for (const item of data.items) {
                // Get oldest batches (FIFO)
                const batches = await tx.inventoryBatch.findMany({
                    where: {
                        variantId: item.variantId,
                        storeId: store.id,
                        remainingQty: { gt: 0 }
                    },
                    orderBy: { receivedDate: 'asc' }
                })

                let remainingQty = item.quantity
                let totalCost = 0

                for (const batch of batches) {
                    if (remainingQty === 0) break

                    const qtyFromBatch = Math.min(remainingQty, batch.remainingQty)
                    const costFromBatch = qtyFromBatch * batch.wholesalePrice

                    // Create order item
                    await tx.orderItem.create({
                        data: {
                            orderId: newOrder.id,
                            variantId: item.variantId,
                            batchId: batch.id,
                            quantity: qtyFromBatch,
                            unitPrice: item.unitPrice,
                            unitCost: batch.wholesalePrice,
                            totalPrice: qtyFromBatch * item.unitPrice
                        }
                    })

                    // Update batch
                    await tx.inventoryBatch.update({
                        where: { id: batch.id },
                        data: { remainingQty: batch.remainingQty - qtyFromBatch }
                    })

                    // Update inventory
                    await tx.inventory.updateMany({
                        where: {
                            variantId: item.variantId,
                            storeId: store.id
                        },
                        data: {
                            quantity: { decrement: qtyFromBatch }
                        }
                    })

                    remainingQty -= qtyFromBatch
                    totalCost += costFromBatch
                }

                if (remainingQty > 0) {
                    throw new Error(`Insufficient stock for variant ${item.variantId}`)
                }
            }

            return newOrder
        })

        revalidatePath('/terminal')
        return { success: true, order }
    } catch (error) {
        console.error('Order creation failed:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Order creation failed' }
    }
}

export async function holdOrder(data: CreateOrderData) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return { success: false, error: 'Unauthorized' }
        }

        // Try to find store assigned to user, fallback to first store
        let store = await prisma.store.findFirst({
            where: { users: { some: { id: session.user.id } } }
        })

        // If no store assigned to user, get the first available store
        if (!store) {
            store = await prisma.store.findFirst()
        }

        if (!store) {
            return { success: false, error: 'No store configured in the system' }
        }

        // Get the actual user from database (session.user.id might not match DB user.id)
        let cashier = await prisma.user.findUnique({
            where: { email: session.user.email! }
        })

        // Fallback to first user if email lookup fails
        if (!cashier) {
            cashier = await prisma.user.findFirst()
        }

        if (!cashier) {
            return { success: false, error: 'No cashier user found' }
        }

        const subtotal = data.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
        const tax = (subtotal - data.discount) * store.taxRate
        const total = subtotal - data.discount + tax
        const orderNumber = `HOLD-${Date.now()}`

        const order = await prisma.order.create({
            data: {
                orderNumber,
                storeId: store.id,
                cashierId: cashier.id,
                customerId: data.customerId,
                subtotal,
                tax,
                discount: data.discount,
                total,
                paymentMethod: data.paymentMethod,
                paymentStatus: 'PENDING',
                status: 'ON_HOLD',
                isOnHold: true,
                notes: data.notes,
            }
        })

        revalidatePath('/terminal')
        return { success: true, order }
    } catch (error) {
        return { success: false, error: 'Failed to hold order' }
    }
}
