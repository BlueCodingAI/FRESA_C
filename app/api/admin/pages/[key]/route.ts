import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, canEdit } from '@/lib/auth'

const ALLOWED_KEYS = ['about_us', 'pricing'] as const

function isValidKey(key: string): key is (typeof ALLOWED_KEYS)[number] {
  return ALLOWED_KEYS.includes(key as (typeof ALLOWED_KEYS)[number])
}

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

function buildStoredContent(content: string, meta: CmsMeta): string {
  const audioUrl = typeof meta.audioUrl === 'string' && meta.audioUrl.trim() ? meta.audioUrl.trim() : null
  const timestampsUrl = typeof meta.timestampsUrl === 'string' && meta.timestampsUrl.trim() ? meta.timestampsUrl.trim() : null

  if (!audioUrl && !timestampsUrl) {
    return content
  }

  const encoded = encodeURIComponent(
    JSON.stringify({
      ...(audioUrl ? { audioUrl } : {}),
      ...(timestampsUrl ? { timestampsUrl } : {}),
    })
  )
  return `${META_PREFIX}${encoded}${META_SUFFIX}\n${content}`
}

// GET - Admin: fetch CMS page for editing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
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

    const { key } = await params
    if (!key || !isValidKey(key)) {
      return NextResponse.json({ error: 'Invalid page key' }, { status: 400 })
    }

    const page = await prisma.cmsPage.findUnique({
      where: { key },
    })

    if (page) {
      const parsed = parseCmsContent(page.content || '')
      return NextResponse.json({
        key: page.key,
        title: page.title,
        content: parsed.content,
        audioUrl: parsed.meta.audioUrl || null,
        timestampsUrl: parsed.meta.timestampsUrl || null,
        updatedAt: page.updatedAt,
      })
    }

    // Defaults for new pages
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
      key,
      title: def.title,
      content: def.content,
      audioUrl: null,
      timestampsUrl: null,
      updatedAt: null,
    })
  } catch (error) {
    console.error('[Admin Pages GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    )
  }
}

// PUT - Admin: update CMS page
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
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

    const { key } = await params
    if (!key || !isValidKey(key)) {
      return NextResponse.json({ error: 'Invalid page key' }, { status: 400 })
    }

    const body = await request.json()
    const { title, content, audioUrl, timestampsUrl } = body

    if (typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    if (audioUrl !== undefined && audioUrl !== null && typeof audioUrl !== 'string') {
      return NextResponse.json({ error: 'audioUrl must be a string' }, { status: 400 })
    }
    if (timestampsUrl !== undefined && timestampsUrl !== null && typeof timestampsUrl !== 'string') {
      return NextResponse.json({ error: 'timestampsUrl must be a string' }, { status: 400 })
    }

    const normalizedContent = content.trim() || ''
    const storedContent = buildStoredContent(normalizedContent, {
      audioUrl: typeof audioUrl === 'string' ? audioUrl : null,
      timestampsUrl: typeof timestampsUrl === 'string' ? timestampsUrl : null,
    })

    // Use CmsPage model (requires prisma generate after adding CmsPage to schema)
    const cmsPage = (prisma as any).cmsPage
    if (!cmsPage) {
      console.error('[Admin Pages PUT] prisma.cmsPage is undefined. Run: npx prisma generate')
      return NextResponse.json(
        { error: 'Server configuration error: run npx prisma generate and restart the server' },
        { status: 500 }
      )
    }

    const page = await cmsPage.upsert({
      where: { key },
      create: {
        key,
        title: title.trim(),
        content: storedContent,
      },
      update: {
        title: title.trim(),
        content: storedContent,
      },
    })

    const parsed = parseCmsContent(page.content || '')

    return NextResponse.json({
      key: page.key,
      title: page.title,
      content: parsed.content,
      audioUrl: parsed.meta.audioUrl || null,
      timestampsUrl: parsed.meta.timestampsUrl || null,
      updatedAt: page.updatedAt,
    })
  } catch (error) {
    console.error('[Admin Pages PUT] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save page' },
      { status: 500 }
    )
  }
}
