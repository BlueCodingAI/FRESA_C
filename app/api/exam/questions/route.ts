import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// GET - Get all questions for Practice/End-of-Course Exam
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

    // Fetch all chapter questions
    const chapterQuestions = await prisma.quizQuestion.findMany({
      where: {
        quizType: 'chapter',
        chapterId: { not: null },
      },
      include: {
        chapter: {
          select: {
            number: true,
            title: true,
          },
        },
      },
      orderBy: [
        { chapter: { number: 'asc' } },
        { order: 'asc' },
      ],
    })

    // Fetch additional questions
    const additionalQuestions = await prisma.additionalQuestion.findMany({
      orderBy: { order: 'asc' },
    })

    // Combine and format questions
    const allQuestions = [
      ...chapterQuestions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        questionAudioUrl: q.questionAudioUrl,
        questionTimestampsUrl: q.questionTimestampsUrl,
        optionAudioUrls: q.optionAudioUrls,
        optionTimestampsUrls: q.optionTimestampsUrls,
        correctExplanationAudioUrl: q.correctExplanationAudioUrl,
        correctExplanationTimestampsUrl: q.correctExplanationTimestampsUrl,
        incorrectExplanationAudioUrls: q.incorrectExplanationAudioUrls,
        incorrectExplanationTimestampsUrls: q.incorrectExplanationTimestampsUrls,
        source: 'chapter',
        chapterNumber: q.chapter?.number,
      })),
      ...additionalQuestions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        questionAudioUrl: q.questionAudioUrl,
        questionTimestampsUrl: q.questionTimestampsUrl,
        optionAudioUrls: q.optionAudioUrls,
        optionTimestampsUrls: q.optionTimestampsUrls,
        correctExplanationAudioUrl: q.correctExplanationAudioUrl,
        correctExplanationTimestampsUrl: q.correctExplanationTimestampsUrl,
        incorrectExplanationAudioUrls: q.incorrectExplanationAudioUrls,
        incorrectExplanationTimestampsUrls: q.incorrectExplanationTimestampsUrls,
        source: 'additional',
      })),
    ]

    return NextResponse.json({ questions: allQuestions })
  } catch (error: any) {
    console.error('[Exam Questions GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch exam questions' }, { status: 500 })
  }
}

