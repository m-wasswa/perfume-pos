import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
    try {
        const { items } = await request.json()

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No items provided' },
                { status: 400 }
            )
        }

        // Get the first store (or create a default one if needed)
        let store = await prisma.store.findFirst()
        
        if (!store) {
            // Create a default store if none exists
            store = await prisma.store.create({
                data: {
                    name: 'Default Store',
                    address: 'Main Location',
                    phone: '+256000000000'
                }
            })
        }

        let createdBatches = 0

        for (const item of items) {
            try {
                // Create inventory batch
                const batch = await prisma.inventoryBatch.create({
                    data: {
                        variantId: item.variantId,
                        storeId: store.id,
                        wholesalePrice: item.wholesalePrice,
                        quantity: item.quantity,
                        remainingQty: item.quantity,
                        vendor: item.vendor,
                        manufactureDate: item.manufactureDate ? new Date(item.manufactureDate) : null,
                        receivedDate: new Date(),
                    }
                })

                // Update or create inventory record
                const existingInventory = await prisma.inventory.findFirst({
                    where: {
                        AND: [
                            { variantId: item.variantId },
                            { storeId: store.id }
                        ]
                    }
                })

                if (existingInventory) {
                    // Update existing inventory
                    await prisma.inventory.update({
                        where: { id: existingInventory.id },
                        data: {
                            quantity: {
                                increment: item.quantity
                            }
                        }
                    })
                } else {
                    // Create new inventory record
                    await prisma.inventory.create({
                        data: {
                            variantId: item.variantId,
                            storeId: store.id,
                            quantity: item.quantity,
                            minStock: 5, // Default minimum stock
                        }
                    })
                }

                createdBatches++
            } catch (error) {
                console.error(`Failed to create batch for variant ${item.variantId}:`, error)
                continue
            }
        }

        revalidatePath('/admin/inventory')

        return NextResponse.json({
            success: true,
            imported: createdBatches,
            total: items.length,
        })
    } catch (error) {
        console.error('Receive stock error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to process stock receipt' },
            { status: 500 }
        )
    }
}
