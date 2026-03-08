import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, canEdit } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET - List sent emails with optional filter; grouped by date (last email sent per day)
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

    const emailLog = (prisma as any).emailLog
    if (!emailLog) {
      return NextResponse.json({
        emails: [],
        groupedByDate: {},
        recipients: [],
      })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all' // 'all' | 'to_me' | 'to_student'
    const recipient = searchParams.get('recipient') || '' // specific email when filter=to_student
    const adminEmail = (process.env.ADMIN_NOTIFY_EMAIL || '').trim().toLowerCase()

    const where: any = {}
    if (filter === 'to_me' && adminEmail) {
      where.to = { equals: adminEmail, mode: 'insensitive' }
    } else if (filter === 'to_student') {
      if (adminEmail) {
        where.NOT = { to: { equals: adminEmail, mode: 'insensitive' } }
      }
      if (recipient) {
        where.to = { equals: recipient, mode: 'insensitive' }
      }
    }

    const emails = await emailLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: 500,
    })

    // Group by date (YYYY-MM-DD) for display
    const groupedByDate: Record<string, typeof emails> = {}
    for (const e of emails) {
      const d = new Date(e.sentAt)
      const key = d.toISOString().slice(0, 10)
      if (!groupedByDate[key]) groupedByDate[key] = []
      groupedByDate[key].push(e)
    }

    // Distinct recipients (students = not admin) for filter dropdown
    const recipientSet = new Set<string>()
    emails.forEach((e: any) => {
      if (e.to && (!adminEmail || e.to.toLowerCase() !== adminEmail)) {
        recipientSet.add(e.to)
      }
    })
    const recipients = Array.from(recipientSet).sort()

    return NextResponse.json({
      emails,
      groupedByDate,
      recipients,
      adminEmail: adminEmail || null,
    })
  } catch (error) {
    console.error('[Admin Communication GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email log' },
      { status: 500 }
    )
  }
}
