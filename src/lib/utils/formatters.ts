export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

export function formatDate(date: Date | string): string {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date))
}

export function formatSKU(brand: string, name: string, size: string): string {
    const cleanBrand = brand.toUpperCase().replace(/\s+/g, '')
    const cleanName = name.toUpperCase().replace(/\s+/g, '')
    const cleanSize = size.toUpperCase().replace(/\s+/g, '')
    return `${cleanBrand}-${cleanName}-${cleanSize}`
}

export function formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
    if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`
    }
    return phone
}
