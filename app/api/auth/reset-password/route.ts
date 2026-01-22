import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import crypto from 'crypto'

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = (body?.token || '').toString().trim()
    const newPassword = (body?.newPassword || '').toString()

    console.log('[reset-password] ========== RESET PASSWORD REQUEST ==========')
    console.log('[reset-password] Token received:', token ? `${token.substring(0, 10)}...` : 'MISSING')
    console.log('[reset-password] New password length:', newPassword.length)

    if (!token || !newPassword) {
      console.log('[reset-password] Missing token or password')
      return NextResponse.json({ error: 'Token and newPassword are required' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      console.log('[reset-password] Password too short')
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const tokenHash = sha256Hex(token)
    console.log('[reset-password] Looking up token hash:', tokenHash.substring(0, 10) + '...')
    
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })

    if (!record) {
      console.log('[reset-password] Token not found in database')
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    if (record.usedAt) {
      console.log('[reset-password] Token already used at:', record.usedAt)
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    // Get current time and expiration time for accurate comparison
    const now = Date.now()
    const expiresAtTime = new Date(record.expiresAt).getTime()
    const timeRemaining = expiresAtTime - now
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60))
    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))

    console.log('[reset-password] Current time:', new Date(now).toISOString())
    console.log('[reset-password] Expires at:', new Date(record.expiresAt).toISOString())
    console.log('[reset-password] Time remaining:', `${hoursRemaining}h ${minutesRemaining}m`)

    if (expiresAtTime < now) {
      console.log('[reset-password] ❌ Token expired at:', new Date(record.expiresAt).toISOString())
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    console.log('[reset-password] ✅ Token is valid, proceeding with password reset')

    console.log('[reset-password] Token is valid')
    console.log('[reset-password] User ID:', record.userId)
    console.log('[reset-password] User email:', record.user.email)

    console.log('[reset-password] Hashing new password...')
    const hashed = await hashPassword(newPassword)
    console.log('[reset-password] Password hashed successfully')

    console.log('[reset-password] Updating database...')
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ])

    console.log('[reset-password] ✅✅✅ Password updated successfully in database')
    console.log('[reset-password] User can now login with new password')

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[reset-password] ❌ ERROR:', error)
    console.error('[reset-password] Error message:', error.message)
    console.error('[reset-password] Error stack:', error.stack)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}


