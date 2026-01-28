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

    // Get exam chapter settings (how many questions from each chapter)
    const examChapterSettings = await prisma.examChapterSettings.findMany({
      orderBy: { chapterNumber: 'asc' },
    })

    // Get all chapters
    const chapters = await prisma.chapter.findMany({
      where: { number: { gt: 0 } }, // Exclude chapter 0 (introduction)
      orderBy: { number: 'asc' },
    })

    // Build questions array based on per-chapter settings
    const selectedQuestions: any[] = []

    // For each chapter, get the specified number of random questions
    for (const chapter of chapters) {
      const setting = examChapterSettings.find(s => s.chapterNumber === chapter.number)
      const questionCount = setting?.questionCount || 0

      if (questionCount > 0) {
        // Fetch all questions for this chapter
        const chapterQuestions = await prisma.quizQuestion.findMany({
          where: {
            chapterId: chapter.id,
            quizType: 'chapter',
          },
          orderBy: { order: 'asc' },
        })

        // Shuffle and select the required number using Fisher-Yates algorithm
        const shuffled = [...chapterQuestions];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const selected = shuffled.slice(0, Math.min(questionCount, chapterQuestions.length))

        selectedQuestions.push(...selected.map((q) => ({
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
          chapterNumber: chapter.number,
        })))
      }
    }

    // Fetch additional questions
    const additionalQuestions = await prisma.additionalQuestion.findMany({
      orderBy: { order: 'asc' },
    })

    // Add all additional questions
    selectedQuestions.push(...additionalQuestions.map((q) => ({
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
    })))

    // Shuffle all questions together using Fisher-Yates algorithm
    const shuffledAll = [...selectedQuestions];
    for (let i = shuffledAll.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledAll[i], shuffledAll[j]] = [shuffledAll[j], shuffledAll[i]];
    }

    return NextResponse.json({ 
      questions: shuffledAll,
      examQuestionCount: shuffledAll.length // Total questions available
    })
  } catch (error: any) {
    console.error('[Exam Questions GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch exam questions' }, { status: 500 })
  }
}

