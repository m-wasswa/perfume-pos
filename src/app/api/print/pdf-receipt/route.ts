import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-config'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { orderId } = await req.json()

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: true
                            }
                        }
                    }
                },
                store: true,
                customer: true,
                cashier: true
            }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Return receipt data for client-side PDF generation
        return NextResponse.json({
            success: true,
            receipt: {
                orderNumber: order.orderNumber,
                date: order.createdAt,
                store: {
                    name: order.store.name,
                    address: order.store.address,
                    phone: order.store.phone
                },
                cashier: order.cashier.name,
                customer: order.customer?.name || 'Walk-in Customer',
                items: order.items.map(item => ({
                    name: `${item.variant.product.brand} ${item.variant.product.name}`,
                    size: item.variant.size,
                    quantity: item.quantity,
                    price: item.unitPrice,
                    total: item.totalPrice
                })),
                subtotal: order.subtotal,
                discount: order.discount,
                tax: order.tax,
                total: order.total,
                paymentMethod: order.paymentMethod
            }
        })
    } catch (error) {
        console.error('Receipt generation error:', error)
        return NextResponse.json(
            { error: 'Failed to generate receipt' },
            { status: 500 }
        )
    }
}
