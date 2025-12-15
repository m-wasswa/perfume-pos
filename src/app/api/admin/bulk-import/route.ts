import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
    try {
        const { products } = await request.json()

        if (!Array.isArray(products) || products.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No products provided' },
                { status: 400 }
            )
        }

        let importedCount = 0
        const errors: string[] = []

        for (let i = 0; i < products.length; i++) {
            const product = products[i]

            try {
                // Check if product exists
                let existingProduct = await prisma.product.findFirst({
                    where: {
                        AND: [
                            { brand: product.brand },
                            { name: product.name }
                        ]
                    }
                })

                // If product doesn't exist, create it
                if (!existingProduct) {
                    const olfactoryNotes = [
                        product.topNotes,
                        product.middleNotes,
                        product.baseNotes,
                    ].filter(note => note && note.trim() !== '')

                    existingProduct = await prisma.product.create({
                        data: {
                            brand: product.brand,
                            name: product.name,
                            description: product.description || '',
                            category: product.category,
                            olfactoryNotes,
                        }
                    })
                }

                // Check if variant with same SKU exists
                const existingVariant = await prisma.variant.findUnique({
                    where: { sku: product.sku }
                })

                if (!existingVariant) {
                    // Create variant
                    await prisma.variant.create({
                        data: {
                            productId: existingProduct.id,
                            sku: product.sku,
                            size: product.size,
                            type: product.type,
                            retailPrice: parseFloat(product.retailPrice),
                            isTester: product.isTester === 'true' || product.isTester === true,
                        }
                    })
                }

                importedCount++
            } catch (error) {
                errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
        }

        revalidatePath('/admin/products')

        return NextResponse.json({
            success: true,
            imported: importedCount,
            total: products.length,
            errors: errors.length > 0 ? errors : undefined
        })
    } catch (error) {
        console.error('Bulk import error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to process import' },
            { status: 500 }
        )
    }
}
