import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, canEdit } from '@/lib/auth'
import { existsSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
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

    const chapterId = request.nextUrl.searchParams.get('chapterId')

    const sections = await prisma.section.findMany({
      where: chapterId ? { chapterId } : undefined,
      include: {
        chapter: {
          select: {
            id: true,
            number: true,
            title: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ sections })
  } catch (error) {
    console.error('Error fetching sections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    )
  }
}

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

    const { chapterId, sectionNumber, title, text, type, audioUrl, timestampsUrl, imageUrl, order } = await request.json()

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

    const section = await prisma.section.create({
      data: {
        chapterId,
        sectionNumber,
        title,
        text,
        type: type || 'content',
        audioUrl: validatedAudioUrl,
        timestampsUrl: validatedTimestampsUrl,
        imageUrl: validatedImageUrl,
        order: order || 0,
      },
    })

    return NextResponse.json({ section }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating section:', error)
    return NextResponse.json(
      { error: 'Failed to create section', details: error.message },
      { status: 500 }
    )
  }
}

