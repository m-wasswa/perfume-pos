import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

interface PerfumeVariant {
    size: string
    price: number
}

interface PerfumeProduct {
    brand: string
    name: string
    variants: PerfumeVariant[]
}

async function main() {
    // Perfume products data - Products and Variants only (no stock)
    const perfumes: PerfumeProduct[] = [
        { brand: 'Britney Spears', name: 'Fantasy', variants: [{ size: '100ml', price: 85000 }, { size: '50ml', price: 50000 }] },
        { brand: 'Issey Miyake', name: 'Issey Miyake', variants: [{ size: '75ml', price: 120000 }, { size: '50ml', price: 80000 }] },
        { brand: 'Givenchy', name: '9pm', variants: [{ size: '100ml', price: 95000 }] },
        { brand: 'Carolina Herrera', name: 'Hago', variants: [{ size: '100ml', price: 90000 }] },
        { brand: 'Kylie Minogue', name: 'Kylie', variants: [{ size: '75ml', price: 75000 }] },
        { brand: 'Carolina Herrera', name: '212 VIP Black NYC', variants: [{ size: '50ml', price: 60000 }, { size: '100ml', price: 100000 }] },
        { brand: 'JOOP!', name: 'JOOP HOMME', variants: [{ size: '75ml', price: 85000 }] },
        { brand: 'Calvin Klein', name: 'ETERNITY Moment', variants: [{ size: '50ml', price: 55000 }, { size: '100ml', price: 95000 }] },
        { brand: 'Aiden', name: 'Aiden', variants: [{ size: '60ml', price: 70000 }] },
        { brand: 'Unknown', name: 'Revolutionary', variants: [{ size: '100ml', price: 80000 }] },
        { brand: 'Just Cavalli', name: 'Just Cavalli', variants: [{ size: '90ml', price: 85000 }] },
        { brand: 'Lattafa', name: 'Lattafa', variants: [{ size: '100ml', price: 45000 }] },
        { brand: 'Calvin Klein', name: 'Calvin Klein Collection', variants: [{ size: '50ml', price: 65000 }, { size: '125ml', price: 110000 }] },
        { brand: 'Jimmy Choo', name: 'Flash', variants: [{ size: '60ml', price: 110000 }] },
        { brand: 'Police', name: 'Police to Be', variants: [{ size: '200ml', price: 95000 }] },
        { brand: 'Hugo Boss', name: 'Boss The Scent', variants: [{ size: '50ml', price: 85000 }] },
        { brand: 'Unknown', name: 'Tobacco Tonka Bean', variants: [{ size: '75ml', price: 70000 }] },
        { brand: 'Christina Aguilera', name: 'Christina Aguilera', variants: [{ size: '50ml', price: 60000 }] },
        { brand: 'Unknown', name: 'Pour Homme', variants: [{ size: '75ml', price: 65000 }, { size: '100ml', price: 85000 }] },
        { brand: 'Ghost', name: 'Ghost', variants: [{ size: '90ml', price: 75000 }] },
        { brand: 'Dolce & Gabbana', name: 'Dolce', variants: [{ size: '50ml', price: 95000 }] },
        { brand: 'Unknown', name: 'Royal Jelly', variants: [{ size: '20ml', price: 35000 }] },
        { brand: 'Elizabeth Arden', name: 'Fifth Avenue', variants: [{ size: '125ml', price: 105000 }] },
        { brand: 'Paco Rabanne', name: '1 Million', variants: [{ size: '100ml', price: 130000 }] },
        { brand: 'Calvin Klein', name: 'CK IN2U', variants: [{ size: '150ml', price: 115000 }] },
        { brand: 'Montblanc', name: 'Montblanc Explorer', variants: [{ size: '50ml', price: 95000 }] },
        { brand: 'Hugo Boss', name: 'Boss Hugo Boss', variants: [{ size: '100ml', price: 120000 }] },
        { brand: 'Hugo Boss', name: 'Boss Night', variants: [{ size: '200ml', price: 110000 }] },
        { brand: 'Calvin Klein', name: 'Euphoria', variants: [{ size: '100ml', price: 105000 }] },
        { brand: 'Hugo Boss', name: 'Boss The Scent Gift Set', variants: [{ size: '100ml', price: 120000 }] },
        { brand: 'Police', name: 'Police', variants: [{ size: '100ml', price: 85000 }] },
        { brand: 'Versace', name: 'Dylan Purple', variants: [{ size: '100ml', price: 130000 }] },
        { brand: 'Ariana Grande', name: 'Ari', variants: [{ size: '100ml', price: 95000 }] },
        { brand: 'Lattafa', name: 'Lattafa Premium', variants: [{ size: '100ml', price: 45000 }] },
        { brand: 'Jaguar', name: 'Jaguar', variants: [{ size: '100ml', price: 75000 }] }
    ]

    console.log('📦 Creating perfume products and variants...')
    let productCount = 0
    let variantCount = 0

    for (const perfume of perfumes) {
        try {
            const product = await prisma.product.create({
                data: {
                    brand: perfume.brand,
                    name: perfume.name,
                    category: 'Perfume',
                    description: `${perfume.brand} ${perfume.name}`,
                    olfactoryNotes: ['Fragrance']
                }
            })

            for (let i = 0; i < perfume.variants.length; i++) {
                const variant = perfume.variants[i]
                const timestamp = Date.now()
                const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
                const brandCode = perfume.brand.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase()
                const nameCode = perfume.name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase()
                const sizeCode = variant.size.replace(/[^0-9]/g, '')
                const sku = `${brandCode}-${nameCode}-${sizeCode}-${randomPart}`
                
                // Generate unique barcode (13 digits for EAN-13 format)
                const barcode = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`.substring(0, 13)
                
                await prisma.variant.create({
                    data: {
                        productId: product.id,
                        sku: sku,
                        barcode: barcode,
                        size: variant.size,
                        type: 'EDP',
                        retailPrice: variant.price,
                        isTester: false
                    }
                })

                variantCount++
            }

            productCount++
            console.log(`✓ ${productCount}. ${perfume.brand} - ${perfume.name} (${perfume.variants.length} variants)`)
        } catch (error) {
            console.error(`❌ Error: ${perfume.brand} ${perfume.name}`, error)
        }
    }

    console.log(`\n✅ Done!`)
    console.log(`📊 Created: ${productCount} products, ${variantCount} variants`)
}

main()
    .catch((e) => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })