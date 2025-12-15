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

        // Generate ESC/POS commands
        const escPos = generateReceiptCommands(order)

        // Get printer IP from environment or database
        const printerIp = process.env.PRINTER_IP || '192.168.1.100'
        const printerPort = process.env.PRINTER_PORT || '9100'

        // Send to printer
        try {
            const response = await fetch(`http://${printerIp}:${printerPort}/print`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream',
                },
                body: Buffer.from(escPos)
            })

            if (!response.ok) {
                throw new Error('Printer communication failed')
            }

            return NextResponse.json({ success: true, message: 'Receipt printed' })
        } catch (printError) {
            console.error('Printer error:', printError)
            return NextResponse.json(
                { error: 'Failed to print receipt', escPos: escPos },
                { status: 500 }
            )
        }
    } catch (error) {
        console.error('Receipt generation error:', error)
        return NextResponse.json(
            { error: 'Failed to generate receipt' },
            { status: 500 }
        )
    }
}

function generateReceiptCommands(order: any): string {
    const ESC = '\x1B'
    const GS = '\x1D'

    let receipt = ''

    // Initialize printer
    receipt += ESC + '@'

    // Center align
    receipt += ESC + 'a' + String.fromCharCode(1)

    // Store name (large, bold)
    receipt += ESC + '!' + String.fromCharCode(0x38)
    receipt += order.store.name + '\n'

    // Normal size
    receipt += ESC + '!' + String.fromCharCode(0)
    receipt += order.store.address + '\n'
    receipt += order.store.phone + '\n'
    receipt += '\n'

    // Order details
    receipt += ESC + 'a' + String.fromCharCode(0) // Left align
    receipt += '================================\n'
    receipt += `Order: ${order.orderNumber}\n`
    receipt += `Date: ${new Date(order.createdAt).toLocaleString()}\n`
    receipt += `Cashier: ${order.cashier.name}\n`
    if (order.customer) {
        receipt += `Customer: ${order.customer.name}\n`
    }
    receipt += '================================\n\n'

    // Items
    order.items.forEach((item: any) => {
        const product = item.variant.product
        const variant = item.variant
        const line = `${product.brand} ${product.name}\n`
        const details = `${variant.size} ${variant.type}\n`
        const price = `${item.quantity} x $${item.unitPrice.toFixed(2)}`
        const total = `$${item.totalPrice.toFixed(2)}`

        receipt += line
        receipt += `  ${details}`
        receipt += `  ${price.padEnd(25)}${total.padStart(10)}\n\n`
    })

    receipt += '================================\n'

    // Totals (right align amounts)
    const subtotalLine = `Subtotal:`.padEnd(25) + `$${order.subtotal.toFixed(2)}`.padStart(10)
    const discountLine = order.discount > 0
        ? `Discount:`.padEnd(25) + `-$${order.discount.toFixed(2)}`.padStart(10) + '\n'
        : ''
    const taxLine = `Tax:`.padEnd(25) + `$${order.tax.toFixed(2)}`.padStart(10)

    receipt += subtotalLine + '\n'
    if (discountLine) receipt += discountLine
    receipt += taxLine + '\n'
    receipt += '================================\n'

    // Total (bold, large)
    receipt += ESC + '!' + String.fromCharCode(0x30)
    const totalLine = `TOTAL:`.padEnd(20) + `$${order.total.toFixed(2)}`.padStart(15)
    receipt += totalLine + '\n'
    receipt += ESC + '!' + String.fromCharCode(0)

    receipt += '================================\n'
    receipt += `Payment: ${order.paymentMethod}\n\n`

    // Center align for footer
    receipt += ESC + 'a' + String.fromCharCode(1)
    receipt += 'Thank you for your purchase!\n'
    receipt += 'Visit us again soon\n\n'

    // Cut paper
    receipt += GS + 'V' + String.fromCharCode(66) + String.fromCharCode(0)

    // Open cash drawer command (if cash payment)
    if (order.paymentMethod === 'CASH') {
        receipt += ESC + 'p' + String.fromCharCode(0) + String.fromCharCode(25) + String.fromCharCode(250)
    }

    return receipt
}
