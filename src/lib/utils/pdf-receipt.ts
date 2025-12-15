import jsPDF from 'jspdf'

interface ReceiptData {
    orderNumber: string
    date: string
    store: {
        name: string
        address: string
        phone: string
    }
    cashier: string
    customer: string
    items: Array<{
        name: string
        size: string
        quantity: number
        price: number
        total: number
    }>
    subtotal: number
    discount: number
    tax: number
    total: number
    paymentMethod: string
}

export function generateReceiptPDF(receipt: ReceiptData) {
    const doc = new jsPDF({
        unit: 'mm',
        format: [80, 200] // 80mm width (thermal receipt size)
    })

    let y = 10

    // Store name (centered, bold)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(receipt.store.name, 40, y, { align: 'center' })
    y += 6

    // Store details (centered)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(receipt.store.address, 40, y, { align: 'center' })
    y += 4
    doc.text(receipt.store.phone, 40, y, { align: 'center' })
    y += 8

    // Separator line
    doc.line(5, y, 75, y)
    y += 5

    // Order details
    doc.setFontSize(9)
    doc.text(`Order: ${receipt.orderNumber}`, 5, y)
    y += 4
    doc.text(`Date: ${new Date(receipt.date).toLocaleString()}`, 5, y)
    y += 4
    doc.text(`Cashier: ${receipt.cashier}`, 5, y)
    y += 4
    doc.text(`Customer: ${receipt.customer}`, 5, y)
    y += 6

    // Separator line
    doc.line(5, y, 75, y)
    y += 5

    // Items header
    doc.setFont('helvetica', 'bold')
    doc.text('Item', 5, y)
    doc.text('Qty', 50, y)
    doc.text('Amount', 65, y, { align: 'right' })
    y += 4

    // Items
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    receipt.items.forEach(item => {
        // Item name and size
        const itemText = `${item.name} (${item.size})`
        const lines = doc.splitTextToSize(itemText, 45)
        doc.text(lines, 5, y)

        // Quantity and price
        doc.text(item.quantity.toString(), 50, y)
        doc.text(`UGX ${item.total.toLocaleString()}`, 75, y, { align: 'right' })

        y += 4 * lines.length
    })

    y += 2

    // Separator line
    doc.line(5, y, 75, y)
    y += 5

    // Totals
    doc.setFontSize(9)
    doc.text('Subtotal:', 5, y)
    doc.text(`UGX ${receipt.subtotal.toLocaleString()}`, 75, y, { align: 'right' })
    y += 4

    if (receipt.discount > 0) {
        doc.text('Discount:', 5, y)
        doc.text(`-UGX ${receipt.discount.toLocaleString()}`, 75, y, { align: 'right' })
        y += 4
    }

    doc.text('Tax:', 5, y)
    doc.text(`UGX ${receipt.tax.toLocaleString()}`, 75, y, { align: 'right' })
    y += 6

    // Total (bold, larger)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('TOTAL:', 5, y)
    doc.text(`UGX ${receipt.total.toLocaleString()}`, 75, y, { align: 'right' })
    y += 8

    // Payment method
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Payment: ${receipt.paymentMethod}`, 40, y, { align: 'center' })
    y += 8

    // Separator line
    doc.line(5, y, 75, y)
    y += 5

    // Thank you message
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Thank you for your purchase!', 40, y, { align: 'center' })

    // Save PDF
    doc.save(`receipt-${receipt.orderNumber}.pdf`)
}
