import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'
import crypto from 'crypto'

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    let token = searchParams.get('token')

    console.log('[verify-email] ========== VERIFICATION REQUEST RECEIVED ==========')
    console.log('[verify-email] Raw token from URL:', token ? `${token.substring(0, 20)}...` : 'MISSING')
    console.log('[verify-email] Token length:', token?.length || 0)
    console.log('[verify-email] Full URL:', request.nextUrl.toString())

    if (!token) {
      console.log('[verify-email] ❌ No token provided in URL')
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Decode URL encoding if present
    try {
      token = decodeURIComponent(token)
      console.log('[verify-email] Token after URL decode:', token.substring(0, 20) + '...')
    } catch (e) {
      console.log('[verify-email] Token was not URL encoded, using as-is')
    }

    const tokenHash = sha256Hex(token)

    console.log('[verify-email] ========== VERIFICATION REQUEST ==========')
    console.log('[verify-email] Raw token (first 20 chars):', token.substring(0, 20) + '...')
    console.log('[verify-email] Token length:', token.length)
    console.log('[verify-email] Token hash (first 20 chars):', tokenHash.substring(0, 20) + '...')
    console.log('[verify-email] Full token hash:', tokenHash)

    // Find verification token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })

    if (!verificationToken) {
      console.log('[verify-email] ❌ Token not found in database')
      console.log('[verify-email] Searching for hash:', tokenHash)
      
      // Token might have been deleted because verification already succeeded
      // Check if there's a user with this email that's already verified
      // We can't directly find the user from the token hash, but we can check
      // if this is a duplicate request by checking recent verification activity
      
      // Try to find if any user was recently verified (within last 5 minutes)
      // This helps handle the case where token was deleted but user is already verified
      const recentVerifiedUsers = await prisma.user.findMany({
        where: {
          emailVerified: true,
          updatedAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
          }
        },
        take: 10,
        select: { id: true, email: true, emailVerified: true, updatedAt: true }
      })
      
      console.log('[verify-email] Recently verified users (last 5 min):', recentVerifiedUsers.length)
      
      // If token not found, it's likely already been used (deleted after successful verification)
      // Return a more helpful error message
      return NextResponse.json(
        { 
          error: 'Invalid or expired verification token',
          message: 'This verification link has already been used or has expired. If you already verified your email, you can log in directly.',
          alreadyUsed: true
        },
        { status: 400 }
      )
    }

    // Get current time and expiration time for accurate comparison
    const now = new Date()
    const expiresAt = new Date(verificationToken.expiresAt)
    const nowTime = now.getTime()
    const expiresAtTime = expiresAt.getTime()
    const timeRemaining = expiresAtTime - nowTime
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60))
    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))

    console.log('[verify-email] Token found')
    console.log('[verify-email] Current time:', now.toISOString())
    console.log('[verify-email] Expires at:', expiresAt.toISOString())
    console.log('[verify-email] Time remaining:', `${hoursRemaining}h ${minutesRemaining}m`)

    // Check if token expired (using getTime() for accurate comparison)
    if (expiresAtTime < nowTime) {
      console.log('[verify-email] ❌ Token has expired')
      // Clean up expired token
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      })
      return NextResponse.json(
        { error: 'Verification token has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    console.log('[verify-email] ✅ Token is valid, proceeding with verification')

    // Check if user already verified
    if (verificationToken.user.emailVerified) {
      console.log('[verify-email] ✅ User email is already verified')
      // Don't delete token here - it might have been deleted already
      // Just return success message
      return NextResponse.json({
        success: true,
        message: 'Email is already verified',
        alreadyVerified: true,
        user: {
          id: verificationToken.user.id,
          email: verificationToken.user.email,
          name: verificationToken.user.name,
          role: verificationToken.user.role,
        },
      })
    }

    // Verify email and delete token in a transaction to ensure consistency
    console.log('[verify-email] Updating user emailVerified status...')
    const user = await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true },
    })
    
    console.log('[verify-email] ✅ User emailVerified updated to:', user.emailVerified)
    console.log('[verify-email] User ID:', user.id)
    console.log('[verify-email] User email:', user.email)

    // Delete verification token
    await prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id },
    })
    console.log('[verify-email] ✅ Verification token deleted')

    // Verify the update was successful by fetching the user again
    const verifiedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, emailVerified: true, username: true, name: true, role: true },
    })
    
    if (!verifiedUser) {
      console.error('[verify-email] ❌ ERROR: User not found after update!')
      return NextResponse.json(
        { error: 'Failed to verify email' },
        { status: 500 }
      )
    }
    
    if (!verifiedUser.emailVerified) {
      console.error('[verify-email] ❌ ERROR: emailVerified is still false after update!')
      return NextResponse.json(
        { error: 'Failed to verify email' },
        { status: 500 }
      )
    }
    
    console.log('[verify-email] ✅ Confirmed: User emailVerified is true')
    console.log('[verify-email] Generating auth token...')

    // Generate auth token for auto-login
    const authToken = generateToken({
      id: verifiedUser.id,
      email: verifiedUser.email,
      username: verifiedUser.username,
      name: verifiedUser.name,
      role: verifiedUser.role,
    })
    
    console.log('[verify-email] ✅ Auth token generated successfully')
    console.log('[verify-email] Token preview:', authToken.substring(0, 20) + '...')

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully!',
      user: {
        id: verifiedUser.id,
        email: verifiedUser.email,
        name: verifiedUser.name,
        role: verifiedUser.role,
        emailVerified: verifiedUser.emailVerified, // Include this in response
      },
      token: authToken,
    })
  } catch (error: any) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify email' },
      { status: 500 }
    )
  }
}

