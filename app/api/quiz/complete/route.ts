import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const token =
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      request.cookies.get('auth-token')?.value

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const chapterNumber = Number(body?.chapterNumber)
    const score = Number(body?.score)
    const total = Number(body?.total)

    if (!chapterNumber || Number.isNaN(chapterNumber)) {
      return NextResponse.json({ error: 'chapterNumber is required' }, { status: 400 })
    }
    if (Number.isNaN(score) || Number.isNaN(total)) {
      return NextResponse.json({ error: 'score and total are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { name: true, email: true, createdAt: true },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const notifyTo = process.env.ADMIN_NOTIFY_EMAIL
    if (!notifyTo) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // Format dates nicely
    const finishDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
    
    const registrationDate = new Date(user.createdAt).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })

    // Calculate percentage
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0
    const passStatus = percentage >= 70 ? 'PASSED ✅' : 'FAILED ❌'

    const studentName = user.name || user.email
    const subject = `${studentName} Completed Chapter ${chapterNumber} Quiz on 63Hours.com`
    
    // Professional and structured email template
    const text = `Dear Administrator,

A student has completed a chapter quiz on 63Hours.com.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:              ${studentName}
Email Address:     ${user.email}
Registration Date: ${registrationDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUIZ COMPLETION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Chapter #:         ${chapterNumber}
Finish Date:       ${finishDate}
Score:             ${score} out of ${total} (${percentage}%)
Status:            ${passStatus}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated notification from the 63Hours.com quiz system.

Best regards,
63Hours.com System`

    console.log('[Quiz Complete] Sending completion email to:', notifyTo)
    try {
      console.log('[Quiz Complete] CALLING sendEmail...')
      await sendEmail({ to: notifyTo, subject, text })
      console.log('[Quiz Complete] ✅ Email sent successfully')
      return NextResponse.json({ ok: true })
    } catch (emailError: any) {
      console.error('[Quiz Complete] ❌ FAILED to send email:', emailError)
      console.error('[Quiz Complete] Error message:', emailError.message)
      console.error('[Quiz Complete] Error stack:', emailError.stack)
      return NextResponse.json({ error: 'Failed to send completion email' }, { status: 500 })
    }
  } catch (e: any) {
    console.error('[Quiz Complete] Unexpected error:', e)
    console.error('[Quiz Complete] Error details:', { message: e.message, stack: e.stack })
    return NextResponse.json({ error: 'Failed to send completion email' }, { status: 500 })
  }
}


