import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const name = (body?.name || '').toString().trim()
    const email = (body?.email || '').toString().trim().toLowerCase()
    const message = (body?.message || '').toString().trim()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 })
    }

    const token =
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      request.cookies.get('auth-token')?.value

    let registrationDate = 'N/A'
    if (token) {
      const decoded = verifyToken(token)
      if (decoded) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { createdAt: true },
        })
        if (user) registrationDate = user.createdAt.toISOString()
      }
    }

    const notifyTo = process.env.ADMIN_NOTIFY_EMAIL
    if (!notifyTo) return NextResponse.json({ ok: true, skipped: true })

    // Format dates nicely
    const submittedAt = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
    
    let formattedRegistrationDate = registrationDate
    if (registrationDate !== 'N/A') {
      formattedRegistrationDate = new Date(registrationDate).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })
    }

    const subject = `Contact Form on 63Hours.com from ${name}`
    
    // Professional and structured email template
    const text = `Dear Administrator,

You have received a new contact form submission on 63Hours.com.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTACT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Contact Form filled out by: ${name}
Email Address:              ${email}
Registration Date:           ${formattedRegistrationDate}
Date Submitted:              ${submittedAt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MESSAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated notification from the 63Hours.com contact form system.

Best regards,
63Hours.com System`

    console.log('[Contact] Sending contact form email to:', notifyTo)
    try {
      console.log('[Contact] CALLING sendEmail...')
      await sendEmail({ to: notifyTo, subject, text })
      console.log('[Contact] ✅ Email sent successfully')
      return NextResponse.json({ ok: true })
    } catch (emailError: any) {
      console.error('[Contact] ❌ FAILED to send email:', emailError)
      console.error('[Contact] Error message:', emailError.message)
      console.error('[Contact] Error stack:', emailError.stack)
      return NextResponse.json({ error: 'Failed to submit contact form' }, { status: 500 })
    }
  } catch (e: any) {
    console.error('[Contact] Unexpected error:', e)
    console.error('[Contact] Error details:', { message: e.message, stack: e.stack })
    return NextResponse.json({ error: 'Failed to submit contact form' }, { status: 500 })
  }
}


