import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// PUT - Update additional question
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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
      select: { role: true },
    })

    if (!user || !['Admin', 'Developer', 'Editor'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      question,
      options,
      correctAnswer,
      explanation,
      questionAudioUrl,
      questionTimestampsUrl,
      optionAudioUrls,
      optionTimestampsUrls,
      correctExplanationAudioUrl,
      correctExplanationTimestampsUrl,
      incorrectExplanationAudioUrls,
      incorrectExplanationTimestampsUrls,
      order,
    } = body

    const updatedQuestion = await prisma.additionalQuestion.update({
      where: { id },
      data: {
        question: question !== undefined ? question : undefined,
        options: options !== undefined ? options : undefined,
        correctAnswer: correctAnswer !== undefined ? parseInt(correctAnswer) : undefined,
        explanation: explanation !== undefined ? explanation : undefined,
        questionAudioUrl: questionAudioUrl !== undefined ? (questionAudioUrl || null) : undefined,
        questionTimestampsUrl: questionTimestampsUrl !== undefined ? (questionTimestampsUrl || null) : undefined,
        optionAudioUrls: optionAudioUrls !== undefined ? (optionAudioUrls || null) : undefined,
        optionTimestampsUrls: optionTimestampsUrls !== undefined ? (optionTimestampsUrls || null) : undefined,
        correctExplanationAudioUrl: correctExplanationAudioUrl !== undefined ? (correctExplanationAudioUrl || null) : undefined,
        correctExplanationTimestampsUrl: correctExplanationTimestampsUrl !== undefined ? (correctExplanationTimestampsUrl || null) : undefined,
        incorrectExplanationAudioUrls: incorrectExplanationAudioUrls !== undefined ? (incorrectExplanationAudioUrls || null) : undefined,
        incorrectExplanationTimestampsUrls: incorrectExplanationTimestampsUrls !== undefined ? (incorrectExplanationTimestampsUrls || null) : undefined,
        order: order !== undefined ? parseInt(order) : undefined,
      },
    })

    return NextResponse.json({ question: updatedQuestion })
  } catch (error: any) {
    console.error('[Additional Questions PUT] Error:', error)
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 })
  }
}

// DELETE - Delete additional question
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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
      select: { role: true },
    })

    if (!user || !['Admin', 'Developer', 'Editor'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.additionalQuestion.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Additional Questions DELETE] Error:', error)
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 })
  }
}

