import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { existsSync } from 'fs'
import { join } from 'path'

// Helper function to validate file exists
function validateFileUrl(url: string | null): string | null {
  if (!url) return null
  
  // Remove leading slash and check if file exists
  const filePath = url.startsWith('/') ? url.slice(1) : url
  const fullPath = join(process.cwd(), 'public', filePath)
  
  if (!existsSync(fullPath)) {
    console.warn(`⚠️ File not found: ${fullPath}. Returning null for URL.`)
    return null
  }
  
  return url
}

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
        },
        quizQuestions: {
          where: {
            quizType: 'chapter',
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found. Please run the seed script to initialize data.' }, { status: 404 })
    }

    // Return sections with their audio URLs (don't validate strictly - let browser handle 404s)
    // This allows audio to work even if files are generated dynamically or paths differ slightly
    const validatedChapter = {
      ...chapter,
      sections: chapter.sections.map((section: any) => ({
        ...section,
        // Always return the URL from database, even if file doesn't exist yet
        // The browser will handle 404s gracefully, and files might be generated dynamically
        audioUrl: section.audioUrl || null,
        timestampsUrl: section.timestampsUrl || null,
        imageUrl: section.imageUrl || null,
      })),
      quizQuestions: chapter.quizQuestions.map((question: any) => ({
        ...question,
        // Ensure all audio URLs are properly returned
        // JSON fields (arrays) are automatically serialized by Prisma
        questionAudioUrl: question.questionAudioUrl || null,
        questionTimestampsUrl: question.questionTimestampsUrl || null,
        optionAudioUrls: question.optionAudioUrls || null,
        optionTimestampsUrls: question.optionTimestampsUrls || null,
        explanationAudioUrl: question.explanationAudioUrl || null,
        explanationTimestampsUrl: question.explanationTimestampsUrl || null,
        correctExplanationAudioUrl: question.correctExplanationAudioUrl || null,
        correctExplanationTimestampsUrl: question.correctExplanationTimestampsUrl || null,
        incorrectExplanationAudioUrls: question.incorrectExplanationAudioUrls || null,
        incorrectExplanationTimestampsUrls: question.incorrectExplanationTimestampsUrls || null,
      })),
    }

    return NextResponse.json({ chapter: validatedChapter })
  } catch (error) {
    console.error('Error fetching chapter:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chapter' },
      { status: 500 }
    )
  }
}

