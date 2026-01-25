import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET - Fetch all additional questions
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

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { role: true },
    })

    if (!user || !['Admin', 'Developer', 'Editor'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const questions = await prisma.additionalQuestion.findMany({
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ questions })
  } catch (error: any) {
    console.error('[Additional Questions GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }
}

// POST - Create new additional question
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

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { role: true },
    })

    if (!user || !['Admin', 'Developer', 'Editor'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      question,
      options,
      correctAnswer,
      explanation,
      questionAudioUrl,
      questionTimestampsUrl,
      optionAudioUrls,
      optionTimestampsUrls,
      correctExplanationAudioUrl,
      correctExplanationTimestampsUrl,
      incorrectExplanationAudioUrls,
      incorrectExplanationTimestampsUrls,
      order,
    } = body

    if (!question || !options || correctAnswer === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const newQuestion = await prisma.additionalQuestion.create({
      data: {
        question,
        options,
        correctAnswer: parseInt(correctAnswer),
        explanation: explanation || { correct: '', incorrect: [] },
        questionAudioUrl: questionAudioUrl || null,
        questionTimestampsUrl: questionTimestampsUrl || null,
        optionAudioUrls: optionAudioUrls || null,
        optionTimestampsUrls: optionTimestampsUrls || null,
        correctExplanationAudioUrl: correctExplanationAudioUrl || null,
        correctExplanationTimestampsUrl: correctExplanationTimestampsUrl || null,
        incorrectExplanationAudioUrls: incorrectExplanationAudioUrls || null,
        incorrectExplanationTimestampsUrls: incorrectExplanationTimestampsUrls || null,
        order: order !== undefined ? parseInt(order) : 0,
      },
    })

    return NextResponse.json({ question: newQuestion })
  } catch (error: any) {
    console.error('[Additional Questions POST] Error:', error)
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 })
  }
}

