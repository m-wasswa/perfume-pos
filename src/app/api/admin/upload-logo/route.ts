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

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'store')
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true })
        }

        const timestamp = Date.now()
        const ext = path.extname(file.name)
        const filename = `logo-${timestamp}${ext}`
        const filepath = path.join(uploadsDir, filename)

        fs.writeFileSync(filepath, buffer)

        const logoUrl = `/uploads/store/${filename}`

        return NextResponse.json({
            success: true,
            logoUrl
        })
    } catch (error) {
        console.error('Logo upload error:', error)
        return NextResponse.json(
            { error: 'Failed to upload logo' },
            { status: 500 }
        )
    }
}
