import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET - Check if all chapters are completed
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

    // Get all chapters
    const chapters = await prisma.chapter.findMany({
      orderBy: { number: 'asc' },
      select: { number: true },
    })

    // Get user progress for all chapters
    const progress = await prisma.userProgress.findMany({
      where: { userId: decoded.id },
      select: { chapterNumber: true, quizCompleted: true },
    })

    // Check if all chapters are completed (excluding chapter 0 which is introduction)
    const chaptersToCheck = chapters.filter(ch => ch.number > 0);
    const allChaptersCompleted = chaptersToCheck.every((chapter) => {
      const chapterProgress = progress.find((p) => p.chapterNumber === chapter.number)
      return chapterProgress?.quizCompleted === true
    })

    return NextResponse.json({ 
      allCompleted: allChaptersCompleted,
      totalChapters: chaptersToCheck.length, // Only count chapters > 0
      completedChapters: progress.filter((p) => p.quizCompleted).length,
    })
  } catch (error: any) {
    console.error('[Progress Check] Error:', error)
    return NextResponse.json({ error: 'Failed to check completion' }, { status: 500 })
  }
}

