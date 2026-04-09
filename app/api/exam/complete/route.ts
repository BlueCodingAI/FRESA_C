import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { getEmailTemplate } from '@/lib/email-templates'

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

    const percentage = total > 0 ? Math.round((score / total) * 100) : 0
    const passed = percentage >= 75 // End-of-Course Exam passing score is 75%
    const siteUrl = process.env.SITE_URL || 'https://63hours.com'

    if (examType === 'end-of-course' && passed) {
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
          timeZone: 'America/New_York',
          timeZoneName: 'short'
        })
        const registrationDate = new Date(user.createdAt).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/New_York',
          timeZoneName: 'short'
        })
        const studentName = user.name || user.email
        const { subject, body: text } = await getEmailTemplate(prisma, 'exam_passed', {
          studentName,
          email: user.email,
          registrationDate,
          finishDate,
          score,
          total,
          percentage,
        })
        try {
          await sendEmail({ to: notifyTo, subject, text })
        } catch (emailError: any) {
          console.error('[End-of-Course Exam] Admin email failed:', emailError)
        }
      }
    }

    if (examType === 'end-of-course' && !passed) {
      const failedAt = new Date()
      await prisma.user.update({
        where: { id: decoded.id },
        data: { endOfCourseFailedAt: failedAt },
      }).catch(() => {})

      const finishDate = failedAt.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/New_York',
        timeZoneName: 'short'
      })
      const registrationDate = new Date(user.createdAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/New_York',
        timeZoneName: 'short'
      })
      const studentName = user.name || user.email

      const notifyTo = process.env.ADMIN_NOTIFY_EMAIL
      if (notifyTo) {
        const { subject, body: text } = await getEmailTemplate(prisma, 'exam_failed_admin', {
          studentName,
          email: user.email,
          registrationDate,
          finishDate,
          score,
          total,
          percentage,
        })
        try {
          await sendEmail({ to: notifyTo, subject, text })
        } catch (e: any) {
          console.error('[End-of-Course Exam] Admin fail notification failed:', e)
        }
      }

      const nextEligible = new Date(failedAt)
      nextEligible.setDate(nextEligible.getDate() + 30)
      const nextEligibleDate = nextEligible.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/New_York'
      })
      const practiceExamLink = `${siteUrl.replace(/\/$/, '')}/practice-exam`
      const { subject: studentSubject, body: studentBody } = await getEmailTemplate(prisma, 'exam_failed_30day_student', {
        name: studentName,
        nextEligibleDate,
        practiceExamLink,
      })
      try {
        await sendEmail({ to: user.email, subject: studentSubject, text: studentBody })
      } catch (e: any) {
        console.error('[End-of-Course Exam] Student 30-day email failed:', e)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[Exam Complete] Error:', error)
    return NextResponse.json({ error: 'Failed to process exam completion' }, { status: 500 })
  }
}

