import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth/auth-config'
import { prisma } from '@/lib/db/prisma'

/**
 * Retry helper for API routes to handle transient database failures
 */
async function retryFetch<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    delay = 300
): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
            console.log(`[API Retry ${attempt + 1}/${maxRetries}] Error: ${lastError.message}`)

            if (attempt < maxRetries - 1) {
                const waitTime = delay * Math.pow(2, attempt)
                await new Promise(resolve => setTimeout(resolve, waitTime))
            }
        }
    }

    throw lastError || new Error('Max retries exceeded')
}

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

        // Use retry logic to fetch product
        const product = await retryFetch(
            async () => {
                return prisma.product.findUnique({
                    where: { id },
                    include: {
                        variants: {
                            include: {
                                inventory: true,
                            },
                        },
                    },
                })
            },
            3,
            300
        )

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
                    barcode: v.barcode,
                    retailPrice: v.retailPrice,
                    isTester: v.isTester,
                    inventory: v.inventory,
                })),
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch product'
        console.error('API error fetching product:', error)
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        )
    }
}
