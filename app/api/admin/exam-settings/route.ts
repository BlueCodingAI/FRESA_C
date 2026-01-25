import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, canEdit } from '@/lib/auth'

// GET - Get exam settings
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

    // Get or create settings
    let settings = await prisma.settings.findUnique({
      where: { id: 'main' },
    })

    if (!settings) {
      // Create default settings if they don't exist
      settings = await prisma.settings.create({
        data: {
          id: 'main',
          examQuestionCount: 100,
        },
      })
    }

    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error('[Exam Settings GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch exam settings' }, { status: 500 })
  }
}

// PUT - Update exam settings
export async function PUT(request: NextRequest) {
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
    const { examQuestionCount } = body

    if (typeof examQuestionCount !== 'number' || examQuestionCount < 1) {
      return NextResponse.json({ error: 'examQuestionCount must be a positive number' }, { status: 400 })
    }

    // Update or create settings
    const settings = await prisma.settings.upsert({
      where: { id: 'main' },
      update: {
        examQuestionCount,
      },
      create: {
        id: 'main',
        examQuestionCount,
      },
    })

    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error('[Exam Settings PUT] Error:', error)
    return NextResponse.json({ error: 'Failed to update exam settings' }, { status: 500 })
  }
}

