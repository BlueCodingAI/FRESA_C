import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
// Public API to fetch chapter content for frontend pages
// This route is public and doesn't require authentication
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params
    const chapterNumber = parseInt(number)

    if (isNaN(chapterNumber)) {
      return NextResponse.json({ error: 'Invalid chapter number' }, { status: 400 })
    }

    // Fetch chapter from database (should be seeded with original data)
    const chapter = await prisma.chapter.findUnique({
      where: { number: chapterNumber },
      include: {
        sections: {
          // Get ALL sections for the chapter (introduction sections are in chapter 0, not regular chapters)
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            type: true,
            order: true,
            imageUrl: true,
          },
        },
      },
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found. Please run the seed script to initialize data.' }, { status: 404 })
    }

    return NextResponse.json(
      { chapter },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    )
  } catch (error) {
    console.error('Error fetching chapter:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chapter' },
      { status: 500 }
    )
  }
}

