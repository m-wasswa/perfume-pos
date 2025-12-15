import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ sku: string }> }
) {
    try {
        const { sku } = await params

        const variant = await prisma.variant.findUnique({
            where: { sku },
            include: {
                product: {
                    select: {
                        id: true,
                        brand: true,
                        name: true,
                        category: true,
                        description: true,
                        olfactoryNotes: true,
                    }
                },
                inventory: true
            }
        })

        if (!variant) {
            return NextResponse.json(
                { success: false, error: 'Product not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            variant,
            product: variant.product
        })
    } catch (error) {
        console.error('Error fetching product by SKU:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch product' },
            { status: 500 }
        )
    }
}
