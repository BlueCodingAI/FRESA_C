import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = (body?.email || '').toString().trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ ok: true, message: 'If the email exists, a verification link has been sent.' })
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({ ok: true, message: 'Email is already verified.' })
    }

    // Delete existing verification token if any
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    })

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = sha256Hex(verificationToken)
    
    // Create expiration date (24 hours from now)
    // Use UTC to avoid timezone issues
    const now = Date.now()
    const expiresAt = new Date(now + 24 * 60 * 60 * 1000) // 24 hours
    
    console.log('[Resend Verification] Creating new verification token')
    console.log('[Resend Verification] Current time (UTC):', new Date(now).toISOString())
    console.log('[Resend Verification] Expires at (UTC):', expiresAt.toISOString())
    console.log('[Resend Verification] Token will be valid for 24 hours')

    // Create verification token
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    })
    
    console.log('[Resend Verification] ✅ Verification token created successfully')

    // Send verification email
    console.log('[Resend Verification] Preparing to send email to:', user.email)
    try {
      const siteUrl = process.env.SITE_URL || 'http://localhost:3000'
      const verificationLink = `${siteUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(verificationToken)}`
      
      const subject = 'Verify your email - 63Hours.com'
      const text = `Welcome to 63Hours.com!\n\nPlease verify your email address by clicking the link below:\n\n${verificationLink}\n\nThis link will expire in 24 hours.\n\nIf you did not request this verification email, you can safely ignore it.`
      
      console.log('[Resend Verification] CALLING sendEmail...')
      await sendEmail({ to: user.email, subject, text })
      console.log('[Resend Verification] ✅ Email sent successfully to:', user.email)
    } catch (emailError: any) {
      console.error('[Resend Verification] ❌ FAILED to send email:', emailError)
      console.error('[Resend Verification] Error message:', emailError.message)
      console.error('[Resend Verification] Error stack:', emailError.stack)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Verification email sent! Please check your inbox.' 
    })
  } catch (error: any) {
    console.error('[Resend Verification] error:', error)
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    )
  }
}

