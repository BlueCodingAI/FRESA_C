import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ALLOWED_KEYS = ['about_us', 'pricing'] as const

type CmsMeta = {
  audioUrl?: string | null
  timestampsUrl?: string | null
}

const META_PREFIX = '<!--CMS_META:'
const META_SUFFIX = '-->'

function parseCmsContent(raw: string): { content: string; meta: CmsMeta } {
  if (!raw || !raw.startsWith(META_PREFIX)) {
    return { content: raw || '', meta: {} }
  }
  const endIndex = raw.indexOf(META_SUFFIX)
  if (endIndex === -1) {
    return { content: raw, meta: {} }
  }

  const encodedMeta = raw.slice(META_PREFIX.length, endIndex).trim()
  const remaining = raw.slice(endIndex + META_SUFFIX.length).replace(/^\s*\n/, '')

  try {
    const decoded = decodeURIComponent(encodedMeta)
    const parsed = JSON.parse(decoded)
    return {
      content: remaining,
      meta: {
        audioUrl: typeof parsed?.audioUrl === 'string' ? parsed.audioUrl : null,
        timestampsUrl: typeof parsed?.timestampsUrl === 'string' ? parsed.timestampsUrl : null,
      },
    }
  } catch {
    return { content: remaining, meta: {} }
  }
}

const DEFAULT_CONTENT: Record<string, { title: string; content: string }> = {
  about_us: {
    title: 'About Us',
    content: '<p>63Hours is the easiest way to get your Florida real estate license. Our 63-hour pre-license education course is approved by the Florida Real Estate Commission and designed to prepare you for success.</p><p>We combine clear instruction with interactive quizzes and practice exams so you learn at your own pace and stay engaged.</p><p>Whether you&apos;re new to real estate or advancing your career, we&apos;re here to help you reach your goals.</p>',
  },
  pricing: {
    title: 'Pricing',
    content: '<p>Our course is designed to be accessible and straightforward.</p><ul><li><strong>63-Hour Pre-License Course</strong> – Complete access to all chapters, quizzes, and practice materials.</li><li><strong>Practice &amp; End-of-Course Exam</strong> – Included so you can prepare with confidence.</li><li><strong>Certificate</strong> – After passing the end-of-course exam, certificate options are available.</li></ul><p>Contact us for current pricing and any special offers.</p>',
  },
}

// GET - Public: fetch CMS page content by key
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params
  if (!key || !ALLOWED_KEYS.includes(key as typeof ALLOWED_KEYS[number])) {
    return NextResponse.json({ error: 'Invalid page key' }, { status: 400 })
  }

  try {
    const cmsPage = (prisma as any).cmsPage
    if (cmsPage) {
      const page = await cmsPage.findUnique({ where: { key } })
      if (page) {
        const parsed = parseCmsContent(page.content || '')
        return NextResponse.json({
          title: page.title,
          content: parsed.content,
          audioUrl: parsed.meta.audioUrl || null,
          timestampsUrl: parsed.meta.timestampsUrl || null,
        })
      }
    }
  } catch (error) {
    console.error('[Pages GET] Error (falling back to defaults):', error)
  }

  const def = DEFAULT_CONTENT[key]
  return NextResponse.json({
    title: def.title,
    content: def.content,
    audioUrl: null,
    timestampsUrl: null,
  })
}
