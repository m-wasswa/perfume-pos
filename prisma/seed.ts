import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { hash } from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    // Clear existing data
    console.log('🗑️  Clearing existing data...')
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.inventoryBatch.deleteMany()
    await prisma.inventory.deleteMany()
    await prisma.variant.deleteMany()
    await prisma.product.deleteMany()
    await prisma.customer.deleteMany()
    await prisma.expense.deleteMany()
    await prisma.user.deleteMany()
    await prisma.store.deleteMany()
    console.log('✓ Database cleared\n')

    // Create store
    const store = await prisma.store.create({
        data: {
            name: 'Perfume Paradise',
            address: '123 Main St, Kampala, Uganda',
            phone: '+256 700 123 456',
            taxRate: 0.18 // 18% VAT in Uganda
        }
    })

    console.log('✓ Created store:', store.name)

    // Create admin user
    const hashedPassword = await hash('admin123', 12)
    const admin = await prisma.user.create({
        data: {
            email: 'admin@perfume.com',
            name: 'Admin User',
            password: hashedPassword,
            role: 'ADMIN',
            storeId: store.id
        }
    })

    console.log('✓ Created admin user:', admin.email)

    // Create sample products with images
    const products = [
        {
            brand: 'Chanel',
            name: 'No. 5',
            description: 'Iconic floral aldehyde fragrance',
            category: 'Women',
            imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400',
            olfactoryNotes: ['Floral', 'Aldehyde', 'Powdery'],
            variants: [
                { sku: 'CHANEL-NO5-50ML', size: '50ml', type: 'EDP', retailPrice: 450000, barcode: '3614270053124' },
                { sku: 'CHANEL-NO5-100ML', size: '100ml', type: 'EDP', retailPrice: 650000, barcode: '3614270053131' }
            ]
        },
        {
            brand: 'Dior',
            name: 'Sauvage',
            description: 'Fresh and spicy masculine fragrance',
            category: 'Men',
            imageUrl: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400',
            olfactoryNotes: ['Citrus', 'Pepper', 'Ambroxan'],
            variants: [
                { sku: 'DIOR-SAUVAGE-60ML', size: '60ml', type: 'EDT', retailPrice: 380000, barcode: '3348901011457' },
                { sku: 'DIOR-SAUVAGE-100ML', size: '100ml', type: 'EDT', retailPrice: 520000, barcode: '3348901011464' }
            ]
        },
        {
            brand: 'YSL',
            name: 'Black Opium',
            description: 'Addictive coffee and vanilla fragrance',
            category: 'Women',
            imageUrl: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400',
            olfactoryNotes: ['Coffee', 'Vanilla', 'White Flowers'],
            variants: [
                { sku: 'YSL-BLACKOPIUM-50ML', size: '50ml', type: 'EDP', retailPrice: 350000, barcode: '3614272921654' },
                { sku: 'YSL-BLACKOPIUM-90ML', size: '90ml', type: 'EDP', retailPrice: 480000, barcode: '3614272921661' }
            ]
        },
        {
            brand: 'Tom Ford',
            name: 'Oud Wood',
            description: 'Rare oud wood with exotic spices',
            category: 'Unisex',
            imageUrl: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400',
            olfactoryNotes: ['Oud', 'Sandalwood', 'Spices'],
            variants: [
                { sku: 'TOMFORD-OUDWOOD-50ML', size: '50ml', type: 'EDP', retailPrice: 750000, barcode: '888066001503' },
                { sku: 'TOMFORD-OUDWOOD-100ML', size: '100ml', type: 'EDP', retailPrice: 1200000, barcode: '888066001510' }
            ]
        },
        {
            brand: 'Versace',
            name: 'Eros',
            description: 'Passionate and powerful masculine scent',
            category: 'Men',
            imageUrl: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=400',
            olfactoryNotes: ['Mint', 'Vanilla', 'Tonka Bean'],
            variants: [
                { sku: 'VERSACE-EROS-50ML', size: '50ml', type: 'EDT', retailPrice: 280000, barcode: '8011003814113' },
                { sku: 'VERSACE-EROS-100ML', size: '100ml', type: 'EDT', retailPrice: 420000, barcode: '8011003814120' }
            ]
        },
        {
            brand: 'Gucci',
            name: 'Bloom',
            description: 'Natural floral fragrance for women',
            category: 'Women',
            imageUrl: 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400',
            olfactoryNotes: ['Jasmine', 'Tuberose', 'Rangoon Creeper'],
            variants: [
                { sku: 'GUCCI-BLOOM-50ML', size: '50ml', type: 'EDP', retailPrice: 380000, barcode: '737052453607' },
                { sku: 'GUCCI-BLOOM-100ML', size: '100ml', type: 'EDP', retailPrice: 550000, barcode: '737052453614' }
            ]
        },
        {
            brand: 'Paco Rabanne',
            name: '1 Million',
            description: 'Bold and spicy masculine fragrance',
            category: 'Men',
            imageUrl: 'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=400',
            olfactoryNotes: ['Cinnamon', 'Leather', 'Amber'],
            variants: [
                { sku: 'PACO-1MILLION-50ML', size: '50ml', type: 'EDT', retailPrice: 320000, barcode: '3349666004306' },
                { sku: 'PACO-1MILLION-100ML', size: '100ml', type: 'EDT', retailPrice: 480000, barcode: '3349666004313' }
            ]
        },
        {
            brand: 'Lancôme',
            name: 'La Vie Est Belle',
            description: 'Sweet and elegant feminine fragrance',
            category: 'Women',
            imageUrl: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?w=400',
            olfactoryNotes: ['Iris', 'Patchouli', 'Praline'],
            variants: [
                { sku: 'LANCOME-LAVIE-50ML', size: '50ml', type: 'EDP', retailPrice: 400000, barcode: '3147421206308' },
                { sku: 'LANCOME-LAVIE-100ML', size: '100ml', type: 'EDP', retailPrice: 580000, barcode: '3147421206315' }
            ]
        },
        {
            brand: 'Creed',
            name: 'Aventus',
            description: 'Sophisticated fruity chypre fragrance',
            category: 'Men',
            imageUrl: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400',
            olfactoryNotes: ['Pineapple', 'Birch', 'Musk'],
            variants: [
                { sku: 'CREED-AVENTUS-50ML', size: '50ml', type: 'EDP', retailPrice: 950000, barcode: '842846000157' },
                { sku: 'CREED-AVENTUS-100ML', size: '100ml', type: 'EDP', retailPrice: 1450000, barcode: '842846000164' }
            ]
        },
        {
            brand: 'Giorgio Armani',
            name: 'Si',
            description: 'Chic and intense chypre fruity fragrance',
            category: 'Women',
            imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400',
            olfactoryNotes: ['Cassis', 'Rose', 'Vanilla'],
            variants: [
                { sku: 'ARMANI-SI-50ML', size: '50ml', type: 'EDP', retailPrice: 380000, barcode: '3605521234159' },
                { sku: 'ARMANI-SI-100ML', size: '100ml', type: 'EDP', retailPrice: 520000, barcode: '3605521234166' }
            ]
        },
        {
            brand: 'Dolce & Gabbana',
            name: 'Light Blue',
            description: 'Fresh floral fruity scent evoking Sicilian summer',
            category: 'Women',
            imageUrl: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=400',
            olfactoryNotes: ['Lemon', 'Apple', 'Cedar'],
            variants: [
                { sku: 'DG-LIGHTBLUE-50ML', size: '50ml', type: 'EDT', retailPrice: 320000, barcode: '8033171037152' },
                { sku: 'DG-LIGHTBLUE-100ML', size: '100ml', type: 'EDT', retailPrice: 450000, barcode: '8033171037169' }
            ]
        },
        {
            brand: 'Bvlgari',
            name: 'Man In Black',
            description: 'Neo-Oriental fragrance for the modern man',
            category: 'Men',
            imageUrl: 'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=400',
            olfactoryNotes: ['Rum', 'Leather', 'Tuberose'],
            variants: [
                { sku: 'BVLGARI-MIB-60ML', size: '60ml', type: 'EDP', retailPrice: 350000, barcode: '783320884150' },
                { sku: 'BVLGARI-MIB-100ML', size: '100ml', type: 'EDP', retailPrice: 480000, barcode: '783320884167' }
            ]
        }
    ]

    for (const productData of products) {
        const { variants, ...productInfo } = productData

        const product = await prisma.product.create({
            data: {
                ...productInfo,
                variants: {
                    create: variants
                }
            }
        })

        console.log('✓ Created product:', product.brand, product.name)
    }

    // Create inventory batches for all variants
    const variants = await prisma.variant.findMany()

    for (const variant of variants) {
        const batch = await prisma.inventoryBatch.create({
            data: {
                variantId: variant.id,
                storeId: store.id,
                wholesalePrice: variant.retailPrice * 0.6, // 40% markup
                quantity: 50,
                remainingQty: 50,
                vendor: 'Fragrance Wholesale Co.',
                manufactureDate: new Date('2024-01-01')
            }
        })

        await prisma.inventory.create({
            data: {
                variantId: variant.id,
                storeId: store.id,
                quantity: 50,
                minStock: 10
            }
        })

        console.log('✓ Created inventory for SKU:', variant.sku)
    }

    console.log('\n✅ Database seeded successfully!')
    console.log('\nLogin credentials:')
    console.log('Email: admin@perfume.com')
    console.log('Password: admin123')
    console.log('\nStore: Perfume Paradise - Kampala, Uganda')
    console.log('Products seeded:', products.length)
    console.log('Total variants:', variants.length)
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
