'use server'

import { prisma } from "@/lib/db/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const variantSchema = z.object({
    size: z.string().min(1),
    type: z.string().min(1),
    retailPrice: z.union([z.string(), z.number()]).transform((val) => {
        const num = typeof val === 'string' ? parseFloat(val) : val
        if (isNaN(num) || num <= 0) throw new Error('Price must be a positive number')
        return num
    }),
    sku: z.string().min(1),
    barcode: z.string().optional().default(''),
    isTester: z.boolean().default(false),
})

const updateVariantSchema = variantSchema.extend({
    id: z.string().optional(),
})

const productSchema = z.object({
    brand: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional().default(''),
    category: z.string().min(1),
    imageUrl: z.string().optional().default(''),
    topNotes: z.string().optional().default(''),
    middleNotes: z.string().optional().default(''),
    baseNotes: z.string().optional().default(''),
    variants: z.array(variantSchema).min(1, "At least one variant is required"),
})

const updateProductSchema = z.object({
    brand: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional().default(''),
    category: z.string().min(1),
    imageUrl: z.string().optional().default(''),
    topNotes: z.string().optional().default(''),
    middleNotes: z.string().optional().default(''),
    baseNotes: z.string().optional().default(''),
    variants: z.array(updateVariantSchema).min(1, "At least one variant is required"),
})

export async function createProduct(data: any) {
    try {
        const validated = productSchema.parse({
            brand: data.brand,
            name: data.name,
            description: data.description,
            category: data.category,
            imageUrl: data.imageUrl,
            topNotes: data.topNotes,
            middleNotes: data.middleNotes,
            baseNotes: data.baseNotes,
            variants: data.variants,
        })

        // Combine olfactory notes
        const olfactoryNotes = [
            validated.topNotes,
            validated.middleNotes,
            validated.baseNotes,
        ].filter(note => note && note.trim() !== '')

        // Check for duplicate SKUs
        const existingSKUs = await prisma.variant.findMany({
            where: {
                sku: {
                    in: validated.variants.map(v => v.sku)
                }
            }
        })

        if (existingSKUs.length > 0) {
            return { success: false, error: `SKU already exists: ${existingSKUs[0].sku}` }
        }

        // Create product with variants
        const product = await prisma.product.create({
            data: {
                brand: validated.brand,
                name: validated.name,
                description: validated.description,
                category: validated.category,
                imageUrl: validated.imageUrl, // Save image URL
                olfactoryNotes,
                variants: {
                    create: validated.variants.map(v => ({
                        sku: v.sku,
                        size: v.size,
                        type: v.type,
                        retailPrice: v.retailPrice,
                        barcode: v.barcode || null,
                        isTester: v.isTester,
                    }))
                }
            },
            include: {
                variants: true
            }
        })

        revalidatePath('/admin/products')
        return { success: true, product }
    } catch (error: any) {
        console.error('Product creation error:', error)
        return { 
            success: false, 
            error: error?.message || 'Failed to create product' 
        }
    }
}

export async function getProductBySKU(sku: string) {
    try {
        const variant = await prisma.variant.findUnique({
            where: { sku },
            include: {
                product: true,
                inventory: true
            }
        })

        return { success: true, variant }
    } catch (error) {
        return { success: false, error: 'Product not found' }
    }
}

export async function getProductByBarcode(barcode: string) {
    try {
        const variant = await prisma.variant.findUnique({
            where: { barcode },
            include: {
                product: true,
                inventory: true
            }
        })

        return { success: true, variant }
    } catch (error) {
        return { success: false, error: 'Product not found' }
    }
}

export async function searchProducts(query: string) {
    try {
        const products = await prisma.product.findMany({
            where: {
                OR: [
                    { brand: { contains: query, mode: 'insensitive' } },
                    { name: { contains: query, mode: 'insensitive' } },
                    { olfactoryNotes: { hasSome: [query] } }
                ]
            },
            include: {
                variants: {
                    include: {
                        inventory: true
                    }
                }
            },
            take: 20
        })

        return { success: true, products }
    } catch (error) {
        return { success: false, error: 'Search failed' }
    }
}

export async function getProducts(page = 1, limit = 10) {
    try {
        // If limit is -1, fetch all products (for POS terminal)
        const fetchAll = limit === -1
        const skip = fetchAll ? 0 : (page - 1) * limit

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                skip,
                take: fetchAll ? undefined : limit,
                include: {
                    variants: {
                        include: {
                            inventory: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.product.count()
        ])

        return {
            success: true,
            products,
            pagination: {
                total,
                pages: fetchAll ? 1 : Math.ceil(total / limit),
                current: page,
                limit: fetchAll ? total : limit
            }
        }
    } catch (error) {
        return { success: false, error: 'Failed to fetch products' }
    }
}

export async function updateProduct(productId: string, data: any) {
    try {
        const validated = updateProductSchema.parse({
            brand: data.brand,
            name: data.name,
            description: data.description,
            category: data.category,
            imageUrl: data.imageUrl,
            topNotes: data.topNotes,
            middleNotes: data.middleNotes,
            baseNotes: data.baseNotes,
            variants: data.variants,
        })

        // Combine olfactory notes
        const olfactoryNotes = [
            validated.topNotes,
            validated.middleNotes,
            validated.baseNotes,
        ].filter(note => note && note.trim() !== '')

        // Get existing product
        const existingProduct = await prisma.product.findUnique({
            where: { id: productId },
            include: { variants: true }
        })

        if (!existingProduct) {
            return { success: false, error: 'Product not found' }
        }

        // Check for duplicate SKUs (excluding current product's variants)
        const newSKUs = validated.variants
            .filter(v => !existingProduct.variants.some(ev => ev.sku === v.sku))
            .map(v => v.sku)

        if (newSKUs.length > 0) {
            const existingSKUs = await prisma.variant.findMany({
                where: {
                    sku: { in: newSKUs },
                    productId: { not: productId }
                }
            })

            if (existingSKUs.length > 0) {
                return { success: false, error: `SKU already exists: ${existingSKUs[0].sku}` }
            }
        }

        // Update product
        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: {
                brand: validated.brand,
                name: validated.name,
                description: validated.description,
                category: validated.category,
                imageUrl: validated.imageUrl,
                olfactoryNotes,
            }
        })

        // Handle variants: update existing, create new, delete removed
        const existingVariantIds = existingProduct.variants.map(v => v.id)
        const updatedVariantIds = validated.variants
            .filter(v => v.id)
            .map(v => v.id)

        // Delete variants that were removed
        const variantsToDelete = existingVariantIds.filter(id => !updatedVariantIds.includes(id))
        if (variantsToDelete.length > 0) {
            await prisma.variant.deleteMany({
                where: { id: { in: variantsToDelete } }
            })
        }

        // Update or create variants
        for (const variant of validated.variants) {
            if (variant.id) {
                // Update existing variant
                await prisma.variant.update({
                    where: { id: variant.id },
                    data: {
                        size: variant.size,
                        type: variant.type,
                        sku: variant.sku,
                        retailPrice: variant.retailPrice,
                        barcode: variant.barcode || null,
                        isTester: variant.isTester,
                    }
                })
            } else {
                // Create new variant
                await prisma.variant.create({
                    data: {
                        productId,
                        size: variant.size,
                        type: variant.type,
                        sku: variant.sku,
                        retailPrice: variant.retailPrice,
                        barcode: variant.barcode || null,
                        isTester: variant.isTester,
                    }
                })
            }
        }

        revalidatePath('/admin/products')
        revalidatePath(`/admin/products/${productId}`)
        return { success: true, product: updatedProduct }
    } catch (error: any) {
        console.error('Product update error:', error)
        return {
            success: false,
            error: error?.message || 'Failed to update product'
        }
    }
}

export async function deleteProduct(productId: string) {
    try {
        // Check if product has any inventory attached
        const variantsWithInventory = await prisma.variant.findMany({
            where: { productId },
            include: {
                inventory: {
                    where: {
                        quantity: { gt: 0 }
                    }
                }
            }
        })

        // Check if any variant has inventory
        const hasInventory = variantsWithInventory.some(v => v.inventory.length > 0)
        if (hasInventory) {
            return {
                success: false,
                error: 'Cannot delete product with active inventory. Please clear all inventory first.'
            }
        }

        // Check if product has any orders
        const ordersCount = await prisma.orderItem.count({
            where: {
                variant: {
                    productId
                }
            }
        })

        if (ordersCount > 0) {
            return {
                success: false,
                error: 'Cannot delete product that has been used in orders.'
            }
        }

        // Delete the product (cascade delete will handle variants)
        await prisma.product.delete({
            where: { id: productId }
        })

        revalidatePath('/admin/products')
        return { success: true }
    } catch (error: any) {
        console.error('Product deletion error:', error)
        return {
            success: false,
            error: error?.message || 'Failed to delete product'
        }
    }
}
