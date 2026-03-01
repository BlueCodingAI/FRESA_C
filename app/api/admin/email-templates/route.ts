import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, canEdit } from '@/lib/auth'
import {
  EMAIL_TEMPLATE_KEYS,
  DEFAULT_EMAIL_TEMPLATES,
  type EmailTemplateKey,
} from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

function isEmailTemplateKey(key: string): key is EmailTemplateKey {
  return EMAIL_TEMPLATE_KEYS.includes(key as EmailTemplateKey)
}

// GET – list all email templates (DB values merged with defaults)
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

    // Guard: Prisma client must include EmailTemplate (run: npx prisma generate)
    const emailTemplateModel = (prisma as any).emailTemplate
    if (!emailTemplateModel || typeof emailTemplateModel.findMany !== 'function') {
      console.warn('[Admin Email Templates GET] prisma.emailTemplate not available. Return defaults. Run: npx prisma generate')
      const templates = EMAIL_TEMPLATE_KEYS.map((key) => {
        const def = DEFAULT_EMAIL_TEMPLATES[key]
        return {
          key,
          name: def.name,
          subject: def.subject,
          body: def.body,
          htmlBody: null,
        }
      })
      return NextResponse.json({ templates })
    }

    const dbTemplates = await prisma.emailTemplate.findMany({
      where: { key: { in: [...EMAIL_TEMPLATE_KEYS] } },
    })
    const byKey = Object.fromEntries(dbTemplates.map((t) => [t.key, t]))

    const templates = EMAIL_TEMPLATE_KEYS.map((key) => {
      const def = DEFAULT_EMAIL_TEMPLATES[key]
      const row = byKey[key]
      return {
        key,
        name: def.name,
        subject: row?.subject ?? def.subject,
        body: row?.body ?? def.body,
        htmlBody: row?.htmlBody ?? null,
      }
    })

    return NextResponse.json({ templates })
  } catch (error: any) {
    console.error('[Admin Email Templates GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch email templates' }, { status: 500 })
  }
}

// PUT – update one email template by key
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

    const body = await request.json().catch(() => ({}))
    const { key, subject, body: bodyText, htmlBody } = body

    if (!key || !isEmailTemplateKey(key)) {
      return NextResponse.json(
        { error: 'Valid key is required. Keys: ' + EMAIL_TEMPLATE_KEYS.join(', ') },
        { status: 400 }
      )
    }

    const name = DEFAULT_EMAIL_TEMPLATES[key].name
    const subjectStr = typeof subject === 'string' ? subject : DEFAULT_EMAIL_TEMPLATES[key].subject
    const bodyStr = typeof bodyText === 'string' ? bodyText : DEFAULT_EMAIL_TEMPLATES[key].body
    const htmlStr = htmlBody === undefined || htmlBody === null ? undefined : String(htmlBody)

    const emailTemplateModel = (prisma as any).emailTemplate
    if (!emailTemplateModel || typeof emailTemplateModel.upsert !== 'function') {
      console.warn('[Admin Email Templates PUT] prisma.emailTemplate not available. Run: npx prisma generate')
      return NextResponse.json(
        { error: 'Email templates database not ready. Stop the dev server, run: npx prisma generate, then restart.' },
        { status: 503 }
      )
    }

    const template = await prisma.emailTemplate.upsert({
      where: { key },
      create: {
        key,
        name,
        subject: subjectStr,
        body: bodyStr,
        htmlBody: htmlStr ?? null,
      },
      update: {
        name,
        subject: subjectStr,
        body: bodyStr,
        htmlBody: htmlStr ?? null,
      },
    })

    return NextResponse.json({ template })
  } catch (error: any) {
    console.error('[Admin Email Templates PUT] Error:', error)
    return NextResponse.json({ error: 'Failed to update email template' }, { status: 500 })
  }
}
