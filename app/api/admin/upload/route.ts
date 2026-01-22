import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { verifyToken, canEdit } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || !canEdit(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'audio', 'timestamps', or 'image'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!type || !['audio', 'timestamps', 'image'].includes(type)) {
      return NextResponse.json({ error: 'Invalid file type. Must be "audio", "timestamps", or "image"' }, { status: 400 })
    }

    // Validate file extensions
    const fileName = file.name
    const fileExtension = fileName.split('.').pop()?.toLowerCase()

    if (type === 'audio' && fileExtension !== 'mp3') {
      return NextResponse.json({ error: 'Audio files must be .mp3' }, { status: 400 })
    }

    if (type === 'timestamps' && fileExtension !== 'json') {
      return NextResponse.json({ error: 'Timestamps files must be .json' }, { status: 400 })
    }

    if (type === 'image' && !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '')) {
      return NextResponse.json({ error: 'Image files must be .jpg, .jpeg, .png, .gif, or .webp' }, { status: 400 })
    }

    // Validate image file size (max 10MB)
    if (type === 'image' && file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image size must be less than 10MB' }, { status: 400 })
    }

    // Create directory if it doesn't exist
    const uploadDir = type === 'audio' ? 'public/audio' : type === 'timestamps' ? 'public/timestamps' : 'public/images'
    const uploadPath = join(process.cwd(), uploadDir)

    if (!existsSync(uploadPath)) {
      await mkdir(uploadPath, { recursive: true })
    }

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueFileName = `${timestamp}-${sanitizedFileName}`
    const filePath = join(uploadPath, uniqueFileName)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Return the public URL path (remove 'public/' prefix as Next.js serves from root)
    const publicUrl = type === 'audio' 
      ? `/audio/${uniqueFileName}`
      : type === 'timestamps'
      ? `/timestamps/${uniqueFileName}`
      : `/images/${uniqueFileName}`

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      fileName: uniqueFileName
    })
  } catch (error: any) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500 }
    )
  }
}

