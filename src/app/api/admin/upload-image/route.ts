import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-config'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File is not an image' }, { status: 400 })
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'products')
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true })
        }

        // Generate filename with timestamp
        const timestamp = Date.now()
        const ext = path.extname(file.name)
        const filename = `${timestamp}-${Math.random().toString(36).substr(2, 9)}${ext}`
        const filepath = path.join(uploadsDir, filename)

        // Save file
        fs.writeFileSync(filepath, buffer)

        // Return the relative URL
        const imageUrl = `/uploads/products/${filename}`

        return NextResponse.json({
            success: true,
            imageUrl,
            filename
        })
    } catch (error) {
        console.error('Image upload error:', error)
        return NextResponse.json(
            { error: 'Failed to upload image' },
            { status: 500 }
        )
    }
}
