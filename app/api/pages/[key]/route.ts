import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ALLOWED_KEYS = ['about_us', 'pricing'] as const

// GET - Public: fetch CMS page content by key
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    if (!key || !ALLOWED_KEYS.includes(key as typeof ALLOWED_KEYS[number])) {
      return NextResponse.json({ error: 'Invalid page key' }, { status: 400 })
    }

    const page = await prisma.cmsPage.findUnique({
      where: { key },
    })

    if (page) {
      return NextResponse.json({
        title: page.title,
        content: page.content,
      })
    }

    // Default content when no record exists
    const defaults: Record<string, { title: string; content: string }> = {
      about_us: {
        title: 'About Us',
        content: '<p>63Hours is the easiest way to get your Florida real estate license. Our 63-hour pre-license education course is approved by the Florida Real Estate Commission and designed to prepare you for success.</p><p>We combine clear instruction with interactive quizzes and practice exams so you learn at your own pace and stay engaged.</p><p>Whether you&apos;re new to real estate or advancing your career, we&apos;re here to help you reach your goals.</p>',
      },
      pricing: {
        title: 'Pricing',
        content: '<p>Our course is designed to be accessible and straightforward.</p><ul><li><strong>63-Hour Pre-License Course</strong> – Complete access to all chapters, quizzes, and practice materials.</li><li><strong>Practice &amp; End-of-Course Exam</strong> – Included so you can prepare with confidence.</li><li><strong>Certificate</strong> – After passing the end-of-course exam, certificate options are available.</li></ul><p>Contact us for current pricing and any special offers.</p>',
      },
    }

    const def = defaults[key]
    return NextResponse.json({
      title: def.title,
      content: def.content,
    })
  } catch (error) {
    console.error('[Pages GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    )
  }
}
