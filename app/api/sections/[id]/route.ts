import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public API to fetch one section's full content/media on demand.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Invalid section id' }, { status: 400 })
    }

    const section = await prisma.section.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        text: true,
        type: true,
        audioUrl: true,
        timestampsUrl: true,
        imageUrl: true,
        chapterId: true,
      },
    })

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    return NextResponse.json(
      {
        section: {
          ...section,
          audioUrl: section.audioUrl || null,
          timestampsUrl: section.timestampsUrl || null,
          imageUrl: section.imageUrl || null,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching section:', error)
    return NextResponse.json(
      { error: 'Failed to fetch section' },
      { status: 500 }
    )
  }
}

