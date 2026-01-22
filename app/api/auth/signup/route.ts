import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['Admin', 'Developer', 'Editor', 'Student']).optional(),
})

function slugifyUsernameBase(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '')
    .substring(0, 18) || 'user'
}

async function generateUniqueUsername(email: string, name: string): Promise<string> {
  const emailBase = slugifyUsernameBase(email.split('@')[0] || 'user')
  const nameBase = slugifyUsernameBase(name)
  const base = (emailBase.length >= 3 ? emailBase : nameBase).substring(0, 18) || 'user'

  // Try base first, then add suffixes until unique
  const candidates: string[] = [base]
  for (let i = 0; i < 10; i++) {
    const suffix = Math.floor(1000 + Math.random() * 9000) // 4 digits
    candidates.push(`${base}${suffix}`.substring(0, 22))
  }

  for (const candidate of candidates) {
    const exists = await prisma.user.findUnique({ where: { username: candidate } })
    if (!exists) return candidate
  }

  // Extremely unlikely fallback
  const fallback = `${base}${Date.now().toString().slice(-6)}`.substring(0, 22)
  return fallback
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Database is not configured. Please set DATABASE_URL in your .env file.' },
        { status: 500 }
      )
    }

    // Validate request body
    let body;
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
    
    const { email: emailRaw, password, name, phone, role } = signupSchema.parse(body)
    
    // Normalize email to lowercase for consistency
    const email = emailRaw.trim().toLowerCase()

    // Check if user already exists by email
    let existingUserByEmail;
    try {
      existingUserByEmail = await prisma.user.findUnique({
        where: { email },
      })
    } catch (dbError: any) {
      console.error('Database query error:', dbError)
      if (dbError.code === 'P1001' || dbError.code === 'P1000' || dbError.code === 'P1017') {
        return NextResponse.json(
          { error: 'Database connection failed. Please check your DATABASE_URL and ensure PostgreSQL is running.' },
          { status: 500 }
        )
      }
      throw dbError
    }

    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    const username = await generateUniqueUsername(email, name)

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Default role is Student, but allow Admin to create other roles
    const userRole = role || UserRole.Student

    // Create user with emailVerified = false
    let user;
    try {
      user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          name,
          phone: phone || null,
          role: userRole,
          emailVerified: false, // New users must verify email
        },
      })
    } catch (createError: any) {
      console.error('User creation error:', createError)
      console.error('Error code:', createError.code)
      console.error('Error message:', createError.message)
      
      if (createError.code === 'P2002') {
        const field = createError.meta?.target?.[0] || 'field'
        return NextResponse.json(
          { error: `${field} already exists` },
          { status: 400 }
        )
      }
      
      throw createError
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = sha256Hex(verificationToken)
    
    // Create expiration date (24 hours from now)
    // Use UTC to avoid timezone issues
    const now = Date.now()
    const expiresAt = new Date(now + 24 * 60 * 60 * 1000) // 24 hours
    
    console.log('[Signup] ========== CREATING VERIFICATION TOKEN ==========')
    console.log('[Signup] User ID:', user.id)
    console.log('[Signup] User email:', user.email)
    console.log('[Signup] Raw token (first 20 chars):', verificationToken.substring(0, 20) + '...')
    console.log('[Signup] Token length:', verificationToken.length)
    console.log('[Signup] Token hash (first 20 chars):', tokenHash.substring(0, 20) + '...')
    console.log('[Signup] Full token hash:', tokenHash)
    console.log('[Signup] Current time (UTC):', new Date(now).toISOString())
    console.log('[Signup] Expires at (UTC):', expiresAt.toISOString())
    console.log('[Signup] Token will be valid for 24 hours')

    // Create verification token
    const createdToken = await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    })
    
    console.log('[Signup] ✅ Verification token created successfully')
    console.log('[Signup] Token ID:', createdToken.id)
    console.log('[Signup] Token hash in DB:', createdToken.tokenHash)
    console.log('[Signup] Token expires at:', createdToken.expiresAt.toISOString())

    // Send verification email to user
    console.log('[Signup] Preparing to send verification email to:', user.email)
    let emailSent = false
    let emailError: any = null
    
    try {
      const siteUrl = process.env.SITE_URL || 'http://localhost:3000'
      const verificationLink = `${siteUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(verificationToken)}`
      
      console.log('[Signup] ========== PREPARING VERIFICATION EMAIL ==========')
      console.log('[Signup] Verification link:', verificationLink)
      console.log('[Signup] Token in link (first 20 chars):', verificationToken.substring(0, 20) + '...')
      console.log('[Signup] Token hash that should match:', tokenHash)
      
      const subject = 'Verify your email - 63Hours.com'
      const text = `Welcome to 63Hours.com!\n\nPlease verify your email address by clicking the link below:\n\n${verificationLink}\n\nThis link will expire in 24 hours.\n\nIf you did not create this account, you can safely ignore this email.`
      
      console.log('[Signup] CALLING sendEmail for verification...')
      await sendEmail({ to: user.email, subject, text })
      emailSent = true
      console.log('[Signup] ✅ Verification email sent successfully to:', user.email)
    } catch (emailErrorCaught: any) {
      emailError = emailErrorCaught
      console.error('[Signup] ❌ FAILED to send verification email:', emailErrorCaught)
      console.error('[Signup] Email error message:', emailErrorCaught.message)
      console.error('[Signup] Email error stack:', emailErrorCaught.stack)
      // Don't fail signup if email fails - user can request resend later
      // But log it clearly so we can debug
    }

    // Send admin notification email (best-effort)
    let adminEmailSent = false
    try {
      const notifyTo = process.env.ADMIN_NOTIFY_EMAIL
      if (notifyTo) {
        console.log('[Signup] Sending admin notification to:', notifyTo)
        const subject = 'New Registration on 63Hours.com'
        
        // Format registration date nicely
        const registrationDate = new Date(user.createdAt).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        })
        
        // Professional and structured email template
        const text = `Dear Administrator,

A new user has registered on 63Hours.com.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGISTRATION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:              ${user.name}
Email Address:     ${user.email}
Registration Date: ${registrationDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated notification from the 63Hours.com registration system.

Best regards,
63Hours.com System`
        
        await sendEmail({ to: notifyTo, subject, text })
        adminEmailSent = true
        console.log('[Signup] ✅ Admin notification sent')
      } else {
        console.log('[Signup] ADMIN_NOTIFY_EMAIL not set, skipping admin notification')
      }
    } catch (e: any) {
      console.error('[Signup] ❌ Failed to send registration email notification:', e)
      console.error('[Signup] Admin email error:', e.message)
    }

    // Return success but don't auto-login - user must verify email first
    const response: any = {
      success: true,
      message: 'Account created! Please check your email to verify your account.',
      email: user.email, // Return email for display purposes
    }

    // In development, include email status for debugging
    if (process.env.NODE_ENV === 'development') {
      response.emailSent = emailSent
      response.adminEmailSent = adminEmailSent
      if (emailError) {
        response.emailError = emailError.message
      }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      // Unique constraint violation
      const field = error.meta?.target?.[0] || 'field'
      return NextResponse.json(
        { error: `${field} already exists` },
        { status: 400 }
      )
    }
    
    // Handle database connection errors
    if (error.code === 'P1001' || error.code === 'P1000' || error.code === 'P1017') {
      return NextResponse.json(
        { error: 'Database connection failed. Please check: 1) DATABASE_URL in .env file, 2) PostgreSQL is running, 3) Database exists' },
        { status: 500 }
      )
    }
    
    // Handle table doesn't exist error
    if (error.code === 'P2021' || error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Database tables not found. Please run: npx prisma migrate deploy' },
        { status: 500 }
      )
    }
    
    console.error('Signup error:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    
    // Return more specific error message
    const errorMessage = error.message || 'Failed to create user'
    return NextResponse.json(
      { error: errorMessage, code: error.code || 'UNKNOWN' },
      { status: 500 }
    )
  }
}
