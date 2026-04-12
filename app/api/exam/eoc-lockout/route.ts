import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getEocLockoutPayload } from '@/lib/eoc-lockout'

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

    const payload = getEocLockoutPayload(
      decoded.role,
      user.endOfCourseFailedAt,
      user.endOfCoursePassedAt
    )

    return NextResponse.json(payload)
  } catch (error: any) {
    console.error('[EOC Lockout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check lockout status' },
      { status: 500 }
    )
  }
}
