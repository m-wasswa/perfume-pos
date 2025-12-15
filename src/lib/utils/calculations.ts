export function calculateSubtotal(items: { quantity: number; unitPrice: number }[]): number {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
}

export function calculateTax(subtotal: number, taxRate: number): number {
    return subtotal * taxRate
}

export function calculateTotal(subtotal: number, tax: number, discount: number = 0): number {
    return subtotal + tax - discount
}

export function calculateDiscount(subtotal: number, discountPercent: number): number {
    return subtotal * (discountPercent / 100)
}

export function calculateProfitMargin(retailPrice: number, wholesalePrice: number): number {
    if (retailPrice === 0) return 0
    return ((retailPrice - wholesalePrice) / retailPrice) * 100
}

export function calculateProfit(retailPrice: number, wholesalePrice: number, quantity: number): number {
    return (retailPrice - wholesalePrice) * quantity
}

export function calculateCOGS(batches: { quantity: number; wholesalePrice: number }[]): number {
    return batches.reduce((sum, batch) => sum + (batch.quantity * batch.wholesalePrice), 0)
}

export function allocateFIFO(
    requestedQty: number,
    batches: { id: string; remainingQty: number; wholesalePrice: number }[]
): { batchId: string; quantity: number; unitCost: number }[] {
    const allocations: { batchId: string; quantity: number; unitCost: number }[] = []
    let remaining = requestedQty

    for (const batch of batches) {
        if (remaining <= 0) break

        const allocateQty = Math.min(remaining, batch.remainingQty)
        if (allocateQty > 0) {
            allocations.push({
                batchId: batch.id,
                quantity: allocateQty,
                unitCost: batch.wholesalePrice
            })
            remaining -= allocateQty
        }
    }

    return allocations
}
