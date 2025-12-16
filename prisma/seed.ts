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

    console.log('\n✅ Database seeded successfully!')
    console.log('\nLogin credentials:')
    console.log('Email: admin@perfume.com')
    console.log('Password: admin123')
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
