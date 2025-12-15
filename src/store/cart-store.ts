'use client'

import { create } from 'zustand'
import { CartItem } from '@/lib/types'

interface CartStore {
    items: CartItem[]
    customerId: string | null
    discount: number
    notes: string
    addItem: (item: CartItem) => void
    removeItem: (variantId: string) => void
    updateQuantity: (variantId: string, quantity: number) => void
    setCustomer: (customerId: string | null) => void
    setDiscount: (discount: number) => void
    setNotes: (notes: string) => void
    clearCart: () => void
    getSubtotal: () => number
    getTax: (taxRate: number) => number
    getTotal: (taxRate: number) => number
}

export const useCartStore = create<CartStore>((set, get) => ({
    items: [],
    customerId: null,
    discount: 0,
    notes: '',

    addItem: (item) => set((state) => {
        const existing = state.items.find(i => i.variantId === item.variantId)
        if (existing) {
            return {
                items: state.items.map(i =>
                    i.variantId === item.variantId
                        ? { ...i, quantity: i.quantity + item.quantity, totalPrice: (i.quantity + item.quantity) * i.unitPrice }
                        : i
                )
            }
        }
        return { items: [...state.items, item] }
    }),

    removeItem: (variantId) => set((state) => ({
        items: state.items.filter(i => i.variantId !== variantId)
    })),

    updateQuantity: (variantId, quantity) => set((state) => ({
        items: state.items.map(i =>
            i.variantId === variantId
                ? { ...i, quantity, totalPrice: quantity * i.unitPrice }
                : i
        )
    })),

    setCustomer: (customerId) => set({ customerId }),
    setDiscount: (discount) => set({ discount }),
    setNotes: (notes) => set({ notes }),
    clearCart: () => set({ items: [], customerId: null, discount: 0, notes: '' }),

    getSubtotal: () => {
        const { items } = get()
        return items.reduce((sum, item) => sum + item.totalPrice, 0)
    },

    getTax: (taxRate) => {
        const subtotal = get().getSubtotal()
        const discount = get().discount
        return (subtotal - discount) * taxRate
    },

    getTotal: (taxRate) => {
        const subtotal = get().getSubtotal()
        const discount = get().discount
        const tax = get().getTax(taxRate)
        return subtotal - discount + tax
    }
}))
