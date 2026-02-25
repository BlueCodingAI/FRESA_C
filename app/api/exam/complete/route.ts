import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { sendEmail } from '@/lib/email'

// POST - Complete End-of-Course Exam
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { score, total, examType } = body // examType: 'practice' or 'end-of-course'

    if (Number.isNaN(score) || Number.isNaN(total)) {
      return NextResponse.json({ error: 'score and total are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { name: true, email: true, createdAt: true },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Only send email for End-of-Course Exam if passed (75%+)
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0
    const passed = percentage >= 70 // End-of-Course Exam passing score is 70%
    
    if (examType === 'end-of-course' && passed) {
      // Persist that user passed end-of-course exam (for post-login redirect to pay)
      await prisma.user.updateMany({
        where: { id: decoded.id, endOfCoursePassedAt: null },
        data: { endOfCoursePassedAt: new Date() },
      }).catch(() => {})

      const notifyTo = process.env.ADMIN_NOTIFY_EMAIL
      if (notifyTo) {
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

        const passStatus = 'PASSED ✅'

        const studentName = user.name || user.email
        const subject = `${studentName} passed End-of-Course Exam on 63Hours.com`
        
        const text = `Dear Administrator,

A student has passed the End-of-Course Exam on 63Hours.com.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:              ${studentName}
Email Address:     ${user.email}
Registration Date: ${registrationDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END-OF-COURSE EXAM COMPLETION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Finish Date:       ${finishDate}
Score:             ${score} out of ${total} (${percentage}%)
Status:            ${passStatus}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated notification from the 63Hours.com exam system.

Best regards,
63Hours.com System`

        console.log('[End-of-Course Exam] Sending completion email to:', notifyTo)
        try {
          await sendEmail({ to: notifyTo, subject, text })
          console.log('[End-of-Course Exam] ✅ Email sent successfully')
        } catch (emailError: any) {
          console.error('[End-of-Course Exam] ❌ FAILED to send email:', emailError)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[Exam Complete] Error:', error)
    return NextResponse.json({ error: 'Failed to process exam completion' }, { status: 500 })
  }
}

