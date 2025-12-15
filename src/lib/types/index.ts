import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
    interface Session {
        user?: DefaultSession['user'] & {
            id?: string
            role?: string
            storeId?: string | null
        }
    }

    interface User {
        id?: string
        role?: string
        storeId?: string | null
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        role?: string
        storeId?: string | null
    }
}

export interface CartItem {
    id: string
    variantId: string
    sku: string
    productName: string
    variantDetails: string
    quantity: number
    unitPrice: number
    totalPrice: number
    isTester: boolean
    imageUrl?: string
}

export interface POSState {
    items: CartItem[]
    customerId: string | null
    discount: number
    notes: string
}
