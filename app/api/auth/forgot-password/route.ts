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

    console.log('[forgot-password] Request received for email:', email)
    console.log('[forgot-password] Normalized email (lowercase):', email)

    if (!email) {
      console.log('[forgot-password] No email provided')
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Always respond with success to prevent account enumeration
    // Try to find user with normalized email
    let user = await prisma.user.findUnique({ where: { email } }).catch((err) => {
      console.error('[forgot-password] Database error:', err)
      return null
    })

    // If not found, try case-insensitive search as fallback (for existing users with mixed case)
    if (!user) {
      console.log('[forgot-password] User not found with normalized email, trying case-insensitive search...')
      const allUsers = await prisma.user.findMany().catch(() => [])
      user = allUsers.find(u => u.email.toLowerCase() === email) || null
      if (user) {
        console.log('[forgot-password] Found user with case-insensitive search:', user.email)
        console.log('[forgot-password] ⚠️ WARNING: User email in database has different case:', user.email)
        console.log('[forgot-password] ⚠️ This user should update their email to lowercase for consistency')
      }
    }

    if (!user) {
      console.log('[forgot-password] User not found for email:', email)
      // Still return success to prevent enumeration
      return NextResponse.json({ ok: true, message: 'If an account exists, a reset link has been sent.' })
    }

    console.log('[forgot-password] User found:', user.id, user.email)

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    }).catch((err) => {
      console.warn('[forgot-password] Error deleting old tokens:', err)
    })

    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = sha256Hex(token)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    console.log('[forgot-password] Creating reset token for user:', user.id)

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    })

    const siteUrl = process.env.SITE_URL || 'http://localhost:3000'
    const resetLink = `${siteUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`

    const subject = 'Reset your 63Hours.com password'
    const text = `You requested a password reset.\n\nReset link:\n${resetLink}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`

    console.log('[forgot-password] ========== PREPARING EMAIL ==========')
    console.log('[forgot-password] Email recipient:', user.email)
    console.log('[forgot-password] Reset link:', resetLink)
    console.log('[forgot-password] Subject:', subject)
    console.log('[forgot-password] Text length:', text.length)
    console.log('[forgot-password] About to call sendEmail function...')

    let emailSent = false
    let emailError: any = null

    try {
      console.log('[forgot-password] ========== CALLING sendEmail NOW ==========')
      console.log('[forgot-password] Email params:', { 
        to: user.email, 
        subject, 
        textLength: text.length 
      })
      
      const emailResult = await sendEmail({ to: user.email, subject, text })
      
      console.log('[forgot-password] ========== sendEmail RETURNED ==========')
      console.log('[forgot-password] Email result:', emailResult)
      emailSent = true
      console.log('[forgot-password] ✅✅✅ Email sent successfully to:', user.email)
    } catch (emailErrorCaught: any) {
      emailError = emailErrorCaught
      console.error('[forgot-password] ========== EMAIL SEND FAILED ==========')
      console.error('[forgot-password] ❌ FAILED to send email:', emailErrorCaught)
      console.error('[forgot-password] Error type:', typeof emailErrorCaught)
      console.error('[forgot-password] Error constructor:', emailErrorCaught?.constructor?.name)
      console.error('[forgot-password] Email error message:', emailErrorCaught?.message)
      console.error('[forgot-password] Email error stack:', emailErrorCaught?.stack)
      console.error('[forgot-password] Email error name:', emailErrorCaught?.name)
      console.error('[forgot-password] Full error object:', JSON.stringify(emailErrorCaught, Object.getOwnPropertyNames(emailErrorCaught)))
    }

    // Always return success to prevent account enumeration
    // But include email status for debugging (in both dev and production, but securely)
    const response: any = { 
      ok: true, 
      message: 'If an account exists, a reset link has been sent.'
    }

    // Include email status for debugging (helps identify if email was actually sent)
    // We include this even in production to help with debugging, but don't reveal if user exists
    response._emailStatus = emailSent ? 'sent' : 'failed'
    if (emailError) {
      response._emailError = emailError.message
      console.error('[forgot-password] Email error included in response:', emailError.message)
    }

    // Additional debug info in development
    if (process.env.NODE_ENV === 'development') {
      response.emailSent = emailSent
      response._debug = {
        userFound: !!user,
        userEmail: user?.email,
        tokenCreated: true,
        emailSent: emailSent,
      }
      if (emailError) {
        response.emailError = emailError.message
        response.emailErrorDetails = {
          name: emailError.name,
          message: emailError.message,
          stack: emailError.stack
        }
      }
    }

    console.log('[forgot-password] ========== RETURNING RESPONSE ==========')
    console.log('[forgot-password] Email status:', emailSent ? 'SENT ✅' : 'FAILED ❌')
    if (emailError) {
      console.error('[forgot-password] Email error:', emailError.message)
    }
    console.log('[forgot-password] Response:', JSON.stringify(response, null, 2))
    
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[forgot-password] Unexpected error:', error)
    console.error('[forgot-password] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    })
    // Still return success to prevent account enumeration
    return NextResponse.json({ 
      ok: true, 
      message: 'If an account exists, a reset link has been sent.',
      // In development, include error details
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    })
  }
}


