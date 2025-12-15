import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
    try {
        const variants = await prisma.variant.findMany({
            include: {
                product: {
                    select: {
                        id: true,
                        brand: true,
                        name: true,
                        category: true,
                    }
                }
            },
            orderBy: [
                { product: { brand: 'asc' } },
                { product: { name: 'asc' } },
                { size: 'asc' }
            ]
        })

        return NextResponse.json({
            success: true,
            variants
        })
    } catch (error) {
        console.error('Error fetching variants:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch variants' },
            { status: 500 }
        )
    }
}
