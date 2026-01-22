import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, canEdit, canDelete } from '@/lib/auth'
import { existsSync } from 'fs'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id } = await params
    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        chapter: true,
      },
    })

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    return NextResponse.json({ section })
  } catch (error) {
    console.error('Error fetching section:', error)
    return NextResponse.json(
      { error: 'Failed to fetch section' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const { sectionNumber, title, text, type, audioUrl, timestampsUrl, imageUrl, order } = await request.json()

    // Validate that audio and timestamps files exist if URLs are provided
    let validatedAudioUrl = audioUrl || null
    let validatedTimestampsUrl = timestampsUrl || null

    if (validatedAudioUrl) {
      // Remove leading slash and check if file exists in public/audio
      const audioPath = validatedAudioUrl.startsWith('/') ? validatedAudioUrl.slice(1) : validatedAudioUrl
      const fullAudioPath = join(process.cwd(), 'public', audioPath)
      
      if (!existsSync(fullAudioPath)) {
        console.warn(`⚠️ Audio file not found: ${fullAudioPath}. Setting audioUrl to null.`)
        validatedAudioUrl = null
      }
    }

    if (validatedTimestampsUrl) {
      // Remove leading slash and check if file exists in public/timestamps
      const timestampsPath = validatedTimestampsUrl.startsWith('/') ? validatedTimestampsUrl.slice(1) : validatedTimestampsUrl
      const fullTimestampsPath = join(process.cwd(), 'public', timestampsPath)
      
      if (!existsSync(fullTimestampsPath)) {
        console.warn(`⚠️ Timestamps file not found: ${fullTimestampsPath}. Setting timestampsUrl to null.`)
        validatedTimestampsUrl = null
      }
    }

    // Validate image file if URL is provided (only for local files, allow external URLs)
    let validatedImageUrl = imageUrl || null
    if (validatedImageUrl && validatedImageUrl.startsWith('/')) {
      // Only validate local files (starting with /), allow external URLs
      const imagePath = validatedImageUrl.startsWith('/') ? validatedImageUrl.slice(1) : validatedImageUrl
      const fullImagePath = join(process.cwd(), 'public', imagePath)
      
      if (!existsSync(fullImagePath)) {
        console.warn(`⚠️ Image file not found: ${fullImagePath}. Keeping URL anyway (may be external or uploaded later).`)
        // Don't set to null - allow the URL to be saved even if file doesn't exist yet
      }
    }

    const section = await prisma.section.update({
      where: { id },
      data: {
        sectionNumber,
        title,
        text,
        type,
        audioUrl: validatedAudioUrl,
        timestampsUrl: validatedTimestampsUrl,
        imageUrl: validatedImageUrl,
        order: order || 0,
      },
    })

    return NextResponse.json({ section })
  } catch (error) {
    console.error('Error updating section:', error)
    return NextResponse.json(
      { error: 'Failed to update section' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || !canDelete(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    await prisma.section.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting section:', error)
    return NextResponse.json(
      { error: 'Failed to delete section' },
      { status: 500 }
    )
  }
}

