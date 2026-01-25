import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, canEdit } from '@/lib/auth'

// GET - Get all exam chapter settings
export async function GET(request: NextRequest) {
  try {
    const token =
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || !canEdit(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const settings = await prisma.examChapterSettings.findMany({
      orderBy: { chapterNumber: 'asc' },
    })

    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error('[Exam Chapter Settings GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch exam chapter settings' }, { status: 500 })
  }
}

// POST - Create or update exam chapter setting
export async function POST(request: NextRequest) {
  try {
    const token =
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || !canEdit(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { chapterNumber, questionCount } = body

    if (typeof chapterNumber !== 'number' || chapterNumber < 1) {
      return NextResponse.json({ error: 'chapterNumber must be a positive number' }, { status: 400 })
    }

    if (typeof questionCount !== 'number' || questionCount < 0) {
      return NextResponse.json({ error: 'questionCount must be a non-negative number' }, { status: 400 })
    }

    const setting = await prisma.examChapterSettings.upsert({
      where: { chapterNumber },
      update: { questionCount },
      create: {
        chapterNumber,
        questionCount,
      },
    })

    return NextResponse.json({ setting })
  } catch (error: any) {
    console.error('[Exam Chapter Settings POST] Error:', error)
    return NextResponse.json({ error: 'Failed to update exam chapter setting' }, { status: 500 })
  }
}

