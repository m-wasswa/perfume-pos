import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth/auth-config'
import { prisma } from '@/lib/db/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                variants: {
                    include: {
                        inventory: true,
                    },
                },
            },
        })

        if (!product) {
            return NextResponse.json(
                { success: false, error: 'Product not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            product: {
                id: product.id,
                brand: product.brand,
                name: product.name,
                category: product.category,
                description: product.description,
                imageUrl: product.imageUrl,
                olfactoryNotes: product.olfactoryNotes,
                variants: product.variants.map(v => ({
                    id: v.id,
                    size: v.size,
                    type: v.type,
                    sku: v.sku,
                    retailPrice: v.retailPrice,
                    isTester: v.isTester,
                    inventory: v.inventory,
                })),
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch product'
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        )
    }
}
