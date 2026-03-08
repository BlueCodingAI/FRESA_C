import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

const LOCKOUT_DAYS = 30

// GET - Check if current user is in 30-day lockout after failing End-of-Course exam
export async function GET(request: NextRequest) {
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

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { endOfCourseFailedAt: true, endOfCoursePassedAt: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.endOfCoursePassedAt) {
      return NextResponse.json({
        locked: false,
        daysRemaining: 0,
        nextEligibleDate: null,
      })
    }

    const failedAt = user.endOfCourseFailedAt
    if (!failedAt) {
      return NextResponse.json({
        locked: false,
        daysRemaining: 0,
        nextEligibleDate: null,
      })
    }

    const nextEligible = new Date(failedAt)
    nextEligible.setDate(nextEligible.getDate() + LOCKOUT_DAYS)
    const now = new Date()
    if (now >= nextEligible) {
      return NextResponse.json({
        locked: false,
        daysRemaining: 0,
        nextEligibleDate: null,
      })
    }

    const msRemaining = nextEligible.getTime() - now.getTime()
    const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000))
    const nextEligibleDate = nextEligible.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/New_York',
    })

    return NextResponse.json({
      locked: true,
      daysRemaining,
      nextEligibleDate,
    })
  } catch (error: any) {
    console.error('[EOC Lockout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check lockout status' },
      { status: 500 }
    )
  }
}
