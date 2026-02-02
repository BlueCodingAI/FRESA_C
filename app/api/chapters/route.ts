import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public API to fetch all chapters for frontend navigation
// This route is public and doesn't require authentication
export async function GET(request: NextRequest) {
  try {
    // Get all chapters except chapter 0 (introduction chapter)
    const chapters = await prisma.chapter.findMany({
      where: {
        number: { not: 0 }, // Exclude chapter 0 (introduction)
      },
      include: {
        sections: {
          where: {
            type: { not: 'introduction' }, // Only content sections
          },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            sectionNumber: true,
            order: true,
          },
        },
        _count: {
          select: { 
            sections: true,
            quizQuestions: true,
          },
        },
      },
      orderBy: { number: 'asc' },
    })

    return NextResponse.json(
      { chapters },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    )
  } catch (error) {
    console.error('Error fetching chapters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chapters' },
      { status: 500 }
    )
  }
}

