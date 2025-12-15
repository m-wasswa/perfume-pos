import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const query = searchParams.get('q')

        if (!query) {
            return NextResponse.json(
                { success: false, error: 'Search query is required' },
                { status: 400 }
            )
        }

        const variants = await prisma.variant.findMany({
            where: {
                OR: [
                    { sku: { contains: query, mode: 'insensitive' } },
                    { product: { name: { contains: query, mode: 'insensitive' } } },
                    { product: { brand: { contains: query, mode: 'insensitive' } } },
                ]
            },
            include: {
                product: {
                    select: {
                        id: true,
                        brand: true,
                        name: true,
                    }
                }
            },
            take: 20
        })

        return NextResponse.json({
            success: true,
            variants
        })
    } catch (error) {
        console.error('Search error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to search products' },
            { status: 500 }
        )
    }
}
