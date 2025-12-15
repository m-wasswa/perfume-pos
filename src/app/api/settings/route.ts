import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-config'

// GET - Fetch store settings
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get first store (or user's assigned store)
        const store = await prisma.store.findFirst()

        if (!store) {
            return NextResponse.json({ error: 'No store found' }, { status: 404 })
        }

        return NextResponse.json({ store })
    } catch (error) {
        console.error('Settings fetch error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        )
    }
}

// PUT - Update store settings
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, address, phone, taxRate, logo } = await req.json()

        // Validate required fields
        if (!name || !address || !phone || taxRate === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate tax rate
        if (taxRate < 0 || taxRate > 1) {
            return NextResponse.json(
                { error: 'Tax rate must be between 0 and 1' },
                { status: 400 }
            )
        }

        // Get first store
        const store = await prisma.store.findFirst()

        if (!store) {
            return NextResponse.json({ error: 'No store found' }, { status: 404 })
        }

        // Update store
        const updatedStore = await prisma.store.update({
            where: { id: store.id },
            data: {
                name,
                address,
                phone,
                taxRate,
                // Note: In a real app, you'd upload the logo to cloud storage
                // For now, we'll store the base64 data URL (not recommended for production)
            }
        })

        return NextResponse.json({
            success: true,
            store: updatedStore
        })
    } catch (error) {
        console.error('Settings update error:', error)
        return NextResponse.json(
            { error: 'Failed to update settings' },
            { status: 500 }
        )
    }
}
