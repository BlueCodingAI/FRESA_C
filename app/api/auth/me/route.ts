import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not set')
      return NextResponse.json(
        { error: 'Database is not configured. Please set DATABASE_URL in your .env file.' },
        { status: 500 }
      )
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Try to connect to database with timeout
    let user
    try {
      // Use Promise.race to add a timeout for database queries
      const queryPromise = prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          phone: true,
          role: true,
          emailVerified: true,
        },
      })

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      )

      user = await Promise.race([queryPromise, timeoutPromise]) as any
      
      // Check if email is verified
      if (user && !user.emailVerified) {
        console.log('[auth/me] ⚠️ User email not verified:', user.email)
        console.log('[auth/me] User ID:', user.id)
        console.log('[auth/me] emailVerified status:', user.emailVerified)
        return NextResponse.json(
          { error: 'Email not verified', emailVerified: false },
          { status: 403 }
        )
      }
      
      console.log('[auth/me] ✅ User authenticated:', {
        id: user?.id,
        email: user?.email,
        emailVerified: user?.emailVerified,
        role: user?.role
      })
    } catch (dbError: any) {
      console.error('Database query error:', dbError)
      console.error('Error code:', dbError?.code)
      console.error('Error message:', dbError?.message)
      
      // Handle connection errors
      if (dbError?.code === 'P1001' || dbError?.code === 'P1000' || dbError?.code === 'P1017') {
        return NextResponse.json(
          { error: 'Database connection failed. Please check your DATABASE_URL and ensure PostgreSQL is running.' },
          { status: 503 } // Service Unavailable
        )
      }
      
      // Handle table not found
      if (dbError?.code === 'P2021') {
        return NextResponse.json(
          { error: 'Database tables not found. Please run: npx prisma migrate deploy' },
          { status: 503 }
        )
      }
      
      // Handle record not found
      if (dbError?.code === 'P2025') {
        return NextResponse.json(
          { error: 'User not found in database' },
          { status: 404 }
        )
      }
      
      // Handle timeout
      if (dbError?.message === 'Database query timeout') {
        return NextResponse.json(
          { error: 'Database connection timeout. Please check if PostgreSQL is running.' },
          { status: 503 }
        )
      }
      
      // Re-throw unknown database errors
      throw dbError
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error: any) {
    console.error('Auth check error:', error)
    console.error('Error type:', error?.constructor?.name)
    console.error('Error code:', error?.code)
    console.error('Error message:', error?.message)
    
    // Handle specific Prisma errors
    if (error?.code === 'P1001' || error?.code === 'P1000' || error?.code === 'P1017') {
      return NextResponse.json(
        { error: 'Database connection failed. Please check: 1) DATABASE_URL in .env file, 2) PostgreSQL is running, 3) Database exists' },
        { status: 503 }
      )
    }
    
    if (error?.code === 'P2021' || error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Database tables not found. Please run: npx prisma migrate deploy' },
        { status: 503 }
      )
    }
    
    // Return 503 for service errors, 500 for unexpected errors
    const statusCode = error?.message?.includes('timeout') || error?.message?.includes('connection') ? 503 : 500
    
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to verify authentication',
        code: error?.code || 'UNKNOWN'
      },
      { status: statusCode }
    )
  }
}

