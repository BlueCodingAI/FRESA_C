import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'

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
    
    const { email: emailRaw, password } = body

    if (!emailRaw || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Normalize email to lowercase for consistency
    const email = emailRaw.trim().toLowerCase()
    console.log('[login] Normalized email:', email)

    // Find user with error handling
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email },
      })
      
      // If not found, try case-insensitive search as fallback (for existing users with mixed case)
      if (!user) {
        console.log('[login] User not found with normalized email, trying case-insensitive search...')
        const allUsers = await prisma.user.findMany().catch(() => [])
        user = allUsers.find(u => u.email.toLowerCase() === email) || null
        if (user) {
          console.log('[login] Found user with case-insensitive search:', user.email)
          console.log('[login] ⚠️ WARNING: User email in database has different case:', user.email)
        }
      }
    } catch (dbError: any) {
      console.error('Database query error:', dbError)
      console.error('Error code:', dbError?.code)
      console.error('Error message:', dbError?.message)
      
      if (dbError?.code === 'P1001' || dbError?.code === 'P1000' || dbError?.code === 'P1017') {
        return NextResponse.json(
          { error: 'Database connection failed. Please check your DATABASE_URL and ensure PostgreSQL is running.' },
          { status: 503 }
        )
      }
      
      if (dbError?.code === 'P2021') {
        return NextResponse.json(
          { error: 'Database tables not found. Please run: npx prisma migrate deploy' },
          { status: 503 }
        )
      }
      
      throw dbError
    }

    if (!user) {
      console.log('[login] User not found for email:', email)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    console.log('[login] User found:', user.id, user.email)
    console.log('[login] Verifying password...')
    
    // Verify password
    const isValid = await verifyPassword(password, user.password)
    console.log('[login] Password valid:', isValid)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { 
          error: 'Email not verified. Please check your email and click the verification link to activate your account.',
          emailVerified: false,
          email: user.email,
        },
        { status: 403 }
      )
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
    })

    // Students who passed end-of-course but haven't paid: suggest redirect to certification pay
    let needsCertificationPay = false
    if (user.role === 'Student' && user.endOfCoursePassedAt) {
      const paid = await prisma.certificatePayment.findFirst({
        where: { userId: user.id, status: 'completed' },
      })
      if (!paid) needsCertificationPay = true
    }

    // Create response with user data
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      token,
      ...(needsCertificationPay ? { needsCertificationPay: true } : {}),
    })

    // Set cookie in response (server-side)
    const maxAge = 7 * 24 * 60 * 60 // 7 days
    response.cookies.set('auth-token', token, {
      path: '/',
      maxAge,
      sameSite: 'lax',
      httpOnly: false, // Allow client-side access for now
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    })
    
    // Debug: Log cookie setting
    console.log('[Login API] Login successful - Setting cookie for user:', {
      email: user.email,
      role: user.role,
      username: user.username,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...'
    })
    
    // Verify cookie was set in response
    const cookieValue = response.cookies.get('auth-token')?.value
    console.log('[Login API] Cookie in response:', cookieValue ? 'SET' : 'NOT SET')

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    console.error('Error type:', error?.constructor?.name)
    console.error('Error code:', error?.code)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    
    // Handle database connection errors
    if (error?.code === 'P1001' || error?.code === 'P1000' || error?.code === 'P1017') {
      return NextResponse.json(
        { error: 'Database connection failed. Please check: 1) DATABASE_URL in .env file, 2) PostgreSQL is running, 3) Database exists' },
        { status: 503 }
      )
    }
    
    // Handle table not found
    if (error?.code === 'P2021' || error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Database tables not found. Please run: npx prisma migrate deploy' },
        { status: 503 }
      )
    }
    
    // Return specific error message if available
    const errorMessage = error?.message || 'Failed to login. Please try again.'
    const statusCode = error?.code?.startsWith('P') ? 503 : 500
    
    return NextResponse.json(
      { 
        error: errorMessage,
        code: error?.code || 'UNKNOWN',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: statusCode }
    )
  }
}

