import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET - Get user progress
export async function GET(request: NextRequest) {
  try {
    const token =
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const progress = await prisma.userProgress.findMany({
      where: { userId: decoded.id },
      orderBy: { chapterNumber: 'asc' },
    })

    return NextResponse.json({ progress })
  } catch (error: any) {
    console.error('[Progress GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}

// POST - Save user progress
export async function POST(request: NextRequest) {
  try {
    const token =
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { chapterNumber, sectionId, sectionNumber, quizCompleted, quizScore, quizTotal } = body

    if (!chapterNumber) {
      return NextResponse.json({ error: 'chapterNumber is required' }, { status: 400 })
    }

    // Upsert progress
    const progress = await prisma.userProgress.upsert({
      where: {
        userId_chapterNumber: {
          userId: decoded.id,
          chapterNumber: parseInt(chapterNumber),
        },
      },
      update: {
        sectionId: sectionId || undefined,
        sectionNumber: sectionNumber !== undefined ? parseInt(sectionNumber) : undefined,
        quizCompleted: quizCompleted !== undefined ? quizCompleted : undefined,
        quizScore: quizScore !== undefined ? parseInt(quizScore) : undefined,
        quizTotal: quizTotal !== undefined ? parseInt(quizTotal) : undefined,
        lastAccessed: new Date(),
      },
      create: {
        userId: decoded.id,
        chapterNumber: parseInt(chapterNumber),
        sectionId: sectionId || null,
        sectionNumber: sectionNumber !== undefined ? parseInt(sectionNumber) : null,
        quizCompleted: quizCompleted || false,
        quizScore: quizScore !== undefined ? parseInt(quizScore) : null,
        quizTotal: quizTotal !== undefined ? parseInt(quizTotal) : null,
      },
    })

    return NextResponse.json({ progress })
  } catch (error: any) {
    console.error('[Progress POST] Error:', error)
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
  }
}

