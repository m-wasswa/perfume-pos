'use server'

import { prisma } from "@/lib/db/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const receiveStockSchema = z.object({
    variantId: z.string().min(1),
    quantity: z.number().int().positive(),
    cost: z.number().positive(),
    storeId: z.string().min(1),
    vendor: z.string().min(1),
})

export async function getInventory(storeId?: string) {
    try {
        // Get the store - use provided storeId or find the first one
        let finalStoreId = storeId
        
        if (!finalStoreId) {
            const store = await prisma.store.findFirst()
            if (!store) {
                return { success: false, error: 'No store found' }
            }
            finalStoreId = store.id
        }

        // Fetch all batches with variant info
        const batches = await prisma.inventoryBatch.findMany({
            where: {
                storeId: finalStoreId
            },
            include: {
                variant: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                receivedDate: 'desc'
            }
        })

        // Group batches by variant and get the latest batch for each
        const batchesByVariant = new Map<string, typeof batches[0]>()
        batches.forEach(batch => {
            if (!batchesByVariant.has(batch.variantId)) {
                batchesByVariant.set(batch.variantId, batch)
            }
        })

        // Transform to inventory display format with wholesale price from latest batch
        const inventoryWithBatches = Array.from(batchesByVariant.values()).map(batch => ({
            id: batch.id,
            variantId: batch.variantId,
            storeId: batch.storeId,
            quantity: batch.remainingQty,
            minStock: 10,
            wholesalePrice: batch.wholesalePrice,
            vendor: batch.vendor,
            variant: batch.variant,
            batches: batches.filter(b => b.variantId === batch.variantId)
        }))

        return { success: true, inventory: inventoryWithBatches }
    } catch (error) {
        console.error('Get inventory error:', error)
        return { success: false, error: 'Failed to fetch inventory' }
    }
}

export async function receiveStock(data: z.infer<typeof receiveStockSchema>) {
    try {
        const validated = receiveStockSchema.parse(data)

        // Use transaction to ensure data integrity
        await prisma.$transaction(async (tx) => {
            // 1. Create InventoryBatch
            await tx.inventoryBatch.create({
                data: {
                    storeId: validated.storeId,
                    variantId: validated.variantId,
                    quantity: validated.quantity,
                    remainingQty: validated.quantity,
                    wholesalePrice: validated.cost,
                    receivedDate: new Date(),
                    vendor: validated.vendor
                }
            })

            // 2. Update or Create Inventory record
            const existingInventory = await tx.inventory.findUnique({
                where: {
                    variantId_storeId: {
                        storeId: validated.storeId,
                        variantId: validated.variantId
                    }
                }
            })

            if (existingInventory) {
                await tx.inventory.update({
                    where: { id: existingInventory.id },
                    data: {
                        quantity: { increment: validated.quantity }
                    }
                })
            } else {
                await tx.inventory.create({
                    data: {
                        storeId: validated.storeId,
                        variantId: validated.variantId,
                        quantity: validated.quantity,
                        minStock: 10 // Default min stock
                    }
                })
            }
        })

        revalidatePath('/admin/inventory')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Failed to receive stock' }
    }
}

export async function updateInventoryBatch(batchId: string, updates: { quantity?: number; wholesalePrice?: number; vendor?: string; manufactureDateDate?: string }) {
    try {
        // Get the current batch
        const batch = await prisma.inventoryBatch.findUnique({
            where: { id: batchId },
            include: {
                orderItems: {
                    select: { quantity: true }
                }
            }
        })

        if (!batch) {
            return { success: false, error: 'Batch not found' }
        }

        // Calculate used quantity
        const usedQty = batch.orderItems.reduce((sum, item) => sum + item.quantity, 0)
        const newQuantity = updates.quantity ?? batch.quantity

        // Check if trying to reduce below used quantity
        if (newQuantity < usedQty) {
            return {
                success: false,
                error: `Cannot reduce quantity below ${usedQty} (already used in orders)`
            }
        }

        // Update the batch
        const updatedBatch = await prisma.inventoryBatch.update({
            where: { id: batchId },
            data: {
                ...(updates.quantity && { quantity: newQuantity, remainingQty: newQuantity - usedQty }),
                ...(updates.wholesalePrice && { wholesalePrice: updates.wholesalePrice }),
                ...(updates.vendor && { vendor: updates.vendor }),
                ...(updates.manufactureDateDate && { manufactureDate: new Date(updates.manufactureDateDate) })
            }
        })

        revalidatePath('/admin/inventory')
        return { success: true, batch: updatedBatch }
    } catch (error: any) {
        return { success: false, error: error?.message || 'Failed to update batch' }
    }
}

export async function deleteInventoryBatch(batchId: string) {
    try {
        // Get the batch with order items
        const batch = await prisma.inventoryBatch.findUnique({
            where: { id: batchId },
            include: {
                orderItems: {
                    select: { quantity: true }
                }
            }
        })

        if (!batch) {
            return { success: false, error: 'Batch not found' }
        }

        // Check if batch has been used in orders
        if (batch.orderItems.length > 0) {
            return {
                success: false,
                error: 'Cannot delete batch that has been used in orders'
            }
        }

        // Delete the batch
        await prisma.inventoryBatch.delete({
            where: { id: batchId }
        })

        // Update the inventory total
        const inventory = await prisma.inventory.findUnique({
            where: {
                variantId_storeId: {
                    variantId: batch.variantId,
                    storeId: batch.storeId
                }
            }
        })

        if (inventory) {
            await prisma.inventory.update({
                where: { id: inventory.id },
                data: {
                    quantity: { decrement: batch.quantity }
                }
            })
        }

        revalidatePath('/admin/inventory')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error?.message || 'Failed to delete batch' }
    }
}
